import Map "mo:core/Map";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
    email : ?Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
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
  };

  public type Timeframe = {
    #M1;
    #M5;
    #M10;
  };

  public type UserSettings = {
    theme : Text;
    aiSensitivity : Nat;
    defaultTimeframe : Timeframe;
    signalNotifications : Bool;
    language : Text;
    dailyOperationLimit : Nat;
  };

  let analyses = Map.empty<Principal, [AnalysisResult]>();
  let settings = Map.empty<Principal, UserSettings>();

  var geminiApiKey : ?Text = null;

  public shared ({ caller }) func storeExternalAnalysis(result : AnalysisResult) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can store analyses");
    };

    let userAnalyses = switch (analyses.get(caller)) {
      case (null) { [] };
      case (?data) { data };
    };

    let newAnalyses = [result].concat(userAnalyses);
    analyses.add(caller, newAnalyses);
  };

  public query ({ caller }) func getAnalyses() : async [AnalysisResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get analyses");
    };

    let userAnalyses = switch (analyses.get(caller)) {
      case (null) { [] };
      case (?data) { data };
    };

    let reversedIter = userAnalyses.reverse().values();
    reversedIter.take(userAnalyses.size()).toArray();
  };

  public query ({ caller }) func getAnalysisHistory() : async [AnalysisResult] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all analysis history");
    };

    var result : [AnalysisResult] = [];

    for (analysisArray in analyses.values()) {
      result := result.concat(analysisArray);
    };

    result;
  };

  public shared ({ caller }) func updateSettings(newSettings : UserSettings) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update settings");
    };

    if (newSettings.aiSensitivity > 100) {
      Runtime.trap("AI sensitivity must be between 0 and 100");
    };

    if (newSettings.dailyOperationLimit < 3 or newSettings.dailyOperationLimit > 8) {
      Runtime.trap("Daily operation limit must be 3, 4, 6, or 8");
    };

    let validDailyLimit = switch (newSettings.dailyOperationLimit) {
      case (3 or 4 or 6 or 8) { newSettings.dailyOperationLimit };
      case (_) { 3 };
    };

    let updatedSettings = { newSettings with dailyOperationLimit = validDailyLimit };
    settings.add(caller, updatedSettings);

    "Settings updated successfully";
  };

  public query ({ caller }) func getSettings() : async UserSettings {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get settings");
    };

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

  public query ({ caller }) func getCriteria() : async {
    bullishThreshold : Float;
    bearishThreshold : Float;
    confidenceBreakpoint : Float;
    trendStrengthMultiplier : Float;
    supportResistancePadding : Float;
    patternRecognitionSensitivity : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get criteria");
    };

    {
      bullishThreshold = 1.5;
      bearishThreshold = -1.5;
      confidenceBreakpoint = 0.05;
      trendStrengthMultiplier = 1.1;
      supportResistancePadding = 0.03;
      patternRecognitionSensitivity = 75;
    };
  };

  public query ({ caller }) func getTopResistanceLevels() : async [ResistanceLevel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get resistance levels");
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

  public shared ({ caller }) func setGeminiApiKey(apiKey : Text) : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set the Gemini API key");
    };

    if (not apiKey.startsWith(#text("AIza"))) {
      Runtime.trap("Invalid Gemini API key format");
    };

    geminiApiKey := ?apiKey;
    "Gemini API key stored successfully";
  };

  public query ({ caller }) func getGeminiApiKey() : async ?Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can retrieve the Gemini API key");
    };

    geminiApiKey;
  };

  public query ({ caller }) func getDailyOperationProgress(userId : Principal) : async {
    completedOperations : Nat;
    dailyLimit : Nat;
  } {
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
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

  public shared ({ caller }) func setDailyOperationLimit(limit : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set their daily operation limit");
    };

    if (limit != 3 and limit != 4 and limit != 6 and limit != 8) {
      Runtime.trap("Daily operation limit must be 3, 4, 6, or 8");
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
};
