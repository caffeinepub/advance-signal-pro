import Map "mo:core/Map";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

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
  };

  module ResistanceLevel {
    public func compare(level1 : ResistanceLevel, level2 : ResistanceLevel) : Order.Order {
      Nat.compare(level1.strength, level2.strength);
    };
  };

  public type Timeframe = {
    #M1; // 1 minuto
    #M5; // 5 minutos
    #M10; // 10 minutos
  };

  public type UserSettings = {
    theme : Text;
    aiSensitivity : Nat;
    defaultTimeframe : Timeframe;
    signalNotifications : Bool;
    language : Text;
  };

  let analyses = Map.empty<Principal, [AnalysisResult]>();
  let settings = Map.empty<Principal, UserSettings>();

  // Add analysis from client-side computation
  public shared ({ caller }) func addAnalysis(result : AnalysisResult) : async () {
    let userAnalyses = switch (analyses.get(caller)) {
      case (null) { [] };
      case (?data) { data };
    };

    let newAnalyses = [result].concat(userAnalyses);
    analyses.add(caller, newAnalyses);
  };

  // Get all analyses for a user
  public query ({ caller }) func getAnalyses() : async [AnalysisResult] {
    let userAnalyses = switch (analyses.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?data) { data };
    };

    let reversedIter = userAnalyses.reverse().values();
    reversedIter.take(userAnalyses.size()).toArray();
  };

  // Get complete history
  public query func getAnalysisHistory() : async [AnalysisResult] {
    var result : [AnalysisResult] = [];

    for (analysisArray in analyses.values()) {
      result := result.concat(analysisArray);
    };

    result;
  };

  // Update user settings with validation
  public shared ({ caller }) func updateSettings(newSettings : UserSettings) : async () {
    if (newSettings.aiSensitivity > 100) {
      Runtime.trap("AI sensitivity must be between 0 and 100");
    };

    settings.add(caller, newSettings);
  };

  // Get user settings or default values
  public query ({ caller }) func getSettings() : async UserSettings {
    switch (settings.get(caller)) {
      case (null) {
        {
          theme = "light";
          aiSensitivity = 50;
          defaultTimeframe = #M1;
          signalNotifications = true;
          language = "en";
        };
      };
      case (?userSettings) { userSettings };
    };
  };

  // Thresholds and criteria
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

  public query ({ caller }) func getTopResistanceLevels() : async [ResistanceLevel] {
    var allAnalyses : [AnalysisResult] = [];
    for (item in analyses.values()) {
      allAnalyses := allAnalyses.concat(item);
    };

    let allLevels = allAnalyses.flatMap(
      func(analysis) { analysis.resistanceLevels.values() }
    ).sort(); // Removed .toArray() after flatMap

    let topLevelsIter = allLevels.values();
    topLevelsIter.take(5).toArray();
  };
};
