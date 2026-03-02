import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";

import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserId = Principal;

  public type UserProfile = {
    name : Text;
    email : ?Text;
  };

  public type StoreAnalysisResult = {
    #success;
    #anonymousNotPersisted;
  };

  public type AnalysisDirection = {
    #bullish;
    #bearish;
    #sideways;
  };

  public type CandlestickPattern = {
    #engulfing;
    #hammer;
    #doji;
    #shootingStar;
    #none;
  };

  public type ResistanceLevel = {
    price : Float;
    strength : Nat;
  };

  module ResistanceLevel {
    public func compare(level1 : ResistanceLevel, level2 : ResistanceLevel) : Order.Order {
      Nat.compare(level1.strength, level2.strength);
    };
  };

  public type AnalysisResult = {
    direction : AnalysisDirection;
    resistanceLevels : [ResistanceLevel];
    candlestickPatterns : [CandlestickPattern];
    pullbacks : Bool;
    breakouts : Bool;
    trendStrength : Nat;
    confidencePercentage : Nat;
    timestamp : Int;
    image : Storage.ExternalBlob;
    probabilidadeAlta : ?Float;
    probabilidadeBaixa : ?Float;
    acaoSugerida : ?Text;
    entradaExemplo : ?Float;
    stopExemplo : ?Float;
    alvoExemplo : ?Float;
    operationFollowed : ?Bool;
    timeframe : Timeframe;
  };

  public type Timeframe = {
    #M1;
    #M5;
    #M10;
    #M3;
  };

  public type UserSettings = {
    theme : Text;
    aiSensitivity : Nat;
    defaultTimeframe : Timeframe;
    signalNotifications : Bool;
    language : Text;
    dailyOperationLimit : Nat;
  };

  let analyses = Map.empty<UserId, [AnalysisResult]>();
  let userProfiles = Map.empty<UserId, UserProfile>();
  let settings = Map.empty<UserId, UserSettings>();

  public type IsNewUser = Bool;

  // storeAnalysis is intentionally open to all callers including anonymous/guest principals.
  // Per the application intent, anonymous saves must not cause fatal errors on the frontend.
  // Anonymous callers are treated as guests and their data is stored keyed by their anonymous principal.
  public shared ({ caller }) func storeAnalysis(result : AnalysisResult) : async {
    isNewUser : IsNewUser;
    legacyEntriesCount : Nat;
  } {
    var isNewUser = false;
    let userAnalyses = switch (analyses.get(caller)) {
      case (null) {
        isNewUser := true;
        [];
      };
      case (?data) { data };
    };

    let newAnalyses = [result].concat(userAnalyses);
    analyses.add(caller, newAnalyses);

    {
      isNewUser;
      legacyEntriesCount = userAnalyses.size();
    };
  };

  // Any caller (including guests) can read their own analyses.
  public query ({ caller }) func getAnalyses() : async [AnalysisResult] {
    let userAnalyses = switch (analyses.get(caller)) {
      case (null) { [] };
      case (?data) { data };
    };

    userAnalyses.reverse();
  };

  // Returns all users' analyses — admin only.
  public query ({ caller }) func getAnalysisHistory(_units : Nat) : async [AnalysisResult] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view full analysis history");
    };

    var result : [AnalysisResult] = [];

    for (analysisArray in analyses.values()) {
      result := result.concat(analysisArray);
    };

    result;
  };

  // Modifies caller's own settings — requires authenticated user role.
  public shared ({ caller }) func updateSettings(newSettings : UserSettings) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update settings");
    };

    if (newSettings.aiSensitivity > 100) {
      return "AI sensitivity must be between 0 and 100 (" # newSettings.aiSensitivity.toText() # ")";
    };

    if (newSettings.dailyOperationLimit < 3 or newSettings.dailyOperationLimit > 8) {
      return "Daily operation limit must be 3, 4, 6, or 8 (" # newSettings.dailyOperationLimit.toText() # ")";
    };

    let validDailyLimit = switch (newSettings.dailyOperationLimit) {
      case (3 or 4 or 6 or 8) { newSettings.dailyOperationLimit };
      case (_) { 3 };
    };

    let updatedSettings = { newSettings with dailyOperationLimit = validDailyLimit };
    settings.add(caller, updatedSettings);

    "Settings updated successfully";
  };

  // Any caller can read their own settings (returns defaults for guests).
  public query ({ caller }) func getSettings() : async UserSettings {
    switch (settings.get(caller)) {
      case (null) {
        {
          theme = "light";
          aiSensitivity = 50;
          defaultTimeframe = #M1;
          signalNotifications = true;
          language = "en";
          dailyOperationLimit = 3;
        };
      };
      case (?userSettings) { userSettings };
    };
  };

  // Returns static configuration — open to all callers.
  public query ({ caller }) func getCriteria() : async {
    bullishThreshold : Float;
    bearishThreshold : Float;
    confidenceBreakpoint : Float;
    trendStrengthMultiplier : Float;
    supportResistancePadding : Float;
    patternRecognitionSensitivity : Nat;
  } {
    {
      bullishThreshold = 1.5;
      bearishThreshold = -1.5;
      confidenceBreakpoint = 0.05;
      trendStrengthMultiplier = 1.1;
      supportResistancePadding = 0.03;
      patternRecognitionSensitivity = 75;
    };
  };

  // Aggregates resistance levels across all users — requires authenticated user role.
  public query ({ caller }) func getTopResistanceLevels() : async [ResistanceLevel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view top resistance levels");
    };

    var allAnalyses : [AnalysisResult] = [];
    for (item in analyses.values()) {
      allAnalyses := allAnalyses.concat(item);
    };

    let allLevels = allAnalyses.flatMap(
      func(analysis) { analysis.resistanceLevels.values() }
    ).sort();

    let topLevelsIter = allLevels.values();
    topLevelsIter.take(5).toArray();
  };

  // Returns progress for a given userId — caller must be that user or an admin.
  public query ({ caller }) func getDailyOperationProgress(userId : Principal) : async {
    completedOperations : Nat;
    dailyLimit : Nat;
  } {
    if (caller != userId and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own daily operation progress");
    };

    let userAnalyses = switch (analyses.get(userId)) {
      case (null) { [] };
      case (?data) { data };
    };

    let currentDay = Time.now() / (24 * 60 * 60 * 1_000_000_000);
    let todaysAnalyses = userAnalyses.filter(
      func(analysis) {
        let analysisDay = analysis.timestamp / (24 * 60 * 60 * 1_000_000_000);
        analysisDay == currentDay;
      }
    );

    let userSettings = switch (settings.get(userId)) {
      case (null) { { dailyOperationLimit = 3 } };
      case (?s) { s };
    };

    {
      completedOperations = todaysAnalyses.size();
      dailyLimit = userSettings.dailyOperationLimit;
    };
  };

  // Modifies caller's own daily operation limit — requires authenticated user role.
  public shared ({ caller }) func setDailyOperationLimit(limit : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set daily operation limit");
    };

    if (limit != 3 and limit != 4 and limit != 6 and limit != 8) {
      return "Daily operation limit must be 3, 4, 6, or 8 (" # limit.toText() # ")";
    };

    let currentSettings : UserSettings = switch (settings.get(caller)) {
      case (null) {
        {
          theme = "light";
          aiSensitivity = 50;
          defaultTimeframe = #M1;
          signalNotifications = true;
          language = "en";
          dailyOperationLimit = 3;
        };
      };
      case (?s) { s };
    };

    let updatedSettings = { currentSettings with dailyOperationLimit = limit };
    settings.add(caller, updatedSettings);

    "Daily operation limit set to " # limit.toText();
  };

  // Returns the caller's own profile — requires authenticated user role.
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };
    userProfiles.get(caller);
  };

  // Returns a specific user's profile — caller must be that user or an admin.
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  // Saves the caller's own profile — requires authenticated user role.
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save their profile");
    };
    userProfiles.add(caller, profile);
  };
};
