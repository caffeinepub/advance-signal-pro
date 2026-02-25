module {
  // Drop the `geminiApiKey` when migrating from old to new version.
  type OldActor = {
    geminiApiKey : ?Text;
  };

  type NewActor = {
    // No geminiApiKey anymore.
  };

  public func run(old : OldActor) : NewActor {
    // Drop geminiApiKey by returning empty (unit type).
    {};
  };
};
