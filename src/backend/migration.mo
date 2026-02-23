import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
  public type OldUserSettings = {
    theme : Text;
    aiSensitivity : Nat;
    defaultTimeframe : Nat;
    signalNotifications : Bool;
    language : Text;
  };

  public type OldActor = {
    settings : Map.Map<Principal, OldUserSettings>;
  };

  public type NewUserSettings = {
    theme : Text;
    aiSensitivity : Nat;
    defaultTimeframe : Timeframe;
    signalNotifications : Bool;
    language : Text;
  };

  public type NewActor = {
    settings : Map.Map<Principal, NewUserSettings>;
  };

  public type Timeframe = {
    #M1; // 1 minuto
    #M5; // 5 minutos
    #M10; // 10 minutos
  };

  func convertTimeframe(oldTimeframe : Nat) : Timeframe {
    switch (oldTimeframe) {
      case (1) { #M1 };
      case (5) { #M5 };
      case (10) { #M10 };
      case (_) { #M1 };
    };
  };

  public func run(old : OldActor) : NewActor {
    let newSettings = old.settings.map<Principal, OldUserSettings, NewUserSettings>(
      func(_principal, oldSettings) {
        {
          oldSettings with
          defaultTimeframe = convertTimeframe(oldSettings.defaultTimeframe)
        };
      }
    );
    { settings = newSettings };
  };
};
