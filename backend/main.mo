import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

import Registry "blob-storage/registry";


actor MetaMaskLogger {
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

  var logs : OrderedMap.Map<Text, Text> = textMap.empty();
  var cache : OrderedMap.Map<Nat, (Text, Int)> = natMap.empty();

  let registry = Registry.new();

  public func addLog(message : Text) : async () {
    let timestamp = debug_show (Time.now());
    logs := textMap.put(logs, timestamp, message);
  };

  public query func getLogs() : async [(Text, Text)] {
    Iter.toArray(textMap.entries(logs));
  };

  public func clearLogs() : async () {
    logs := textMap.empty();
  };

  public func setCache(key : Nat, value : Text) : async () {
    let currentTime = Time.now();
    cache := natMap.put(cache, key, (value, currentTime));
  };

  public query func getCache(key : Nat) : async ?Text {
    switch (natMap.get(cache, key)) {
      case (null) { null };
      case (?(_value, timestamp)) {
        let currentTime = Time.now();
        if (currentTime - timestamp > 300_000_000_000) { // 300 seconds in nanoseconds
          null;
        } else {
          ?_value;
        };
      };
    };
  };

  public func clearCache() : async () {
    cache := natMap.empty();
  };

  public func cleanExpiredCache() : async () {
    let currentTime = Time.now();
    cache := natMap.mapFilter<(Text, Int), (Text, Int)>(
      cache,
      func(_key, value) {
        if (currentTime - value.1 > 300_000_000_000) {
          null;
        } else {
          ?value;
        };
      },
    );
  };

  public func registerFileReference(path : Text, hash : Text) : async () {
    Registry.add(registry, path, hash);
  };

  public query func getFileReference(path : Text) : async Registry.FileReference {
    Registry.get(registry, path);
  };

  public query func listFileReferences() : async [Registry.FileReference] {
    Registry.list(registry);
  };

  public func dropFileReference(path : Text) : async () {
    Registry.remove(registry, path);
  };
};
