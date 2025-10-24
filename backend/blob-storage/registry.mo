import OrderedMap "mo:base/OrderedMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Array "mo:base/Array";

module {
    public type FileReference = {
        path : Text;
        hash : Text;
    };

    public type Registry = {
        var references : OrderedMap.Map<Text, FileReference>;
        var blobsToRemove : OrderedMap.Map<Text, Bool>;
        var authorizedPrincipals : [Principal];
    };


    public func new() : Registry {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        let hashMap = OrderedMap.Make<Text>(Text.compare);
        let references = pathMap.empty<FileReference>();
        let blobsToRemove = hashMap.empty<Bool>();
        let authorizedPrincipals : [Principal] = [];
        {
            var references;
            var blobsToRemove;
            var authorizedPrincipals;
        };
    };

    public func add(registry : Registry, path : Text, hash : Text) {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        let fileReference = { path; hash };
        
        // Add the file reference to the registry
        registry.references := pathMap.put(registry.references, path, fileReference);
    };

    public func get(registry : Registry, path : Text) : FileReference {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        
        // Get the file reference directly
        switch (pathMap.get(registry.references, path)) {
            case null Debug.trap("Inexistent file reference");
            case (?fileReference) fileReference;
        };
    };

    public func list(registry : Registry) : [FileReference] {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        
        // Return all file references
        Iter.toArray(pathMap.vals(registry.references));
    };

    public func remove(registry : Registry, path : Text) {
        let pathMap = OrderedMap.Make<Text>(Text.compare);
        let hashMap = OrderedMap.Make<Text>(Text.compare);
        
        // Get the file reference to extract the hash before removing
        switch (pathMap.get(registry.references, path)) {
            case null { /* File doesn't exist, nothing to remove */ };
            case (?fileReference) {
                // Add the hash to the blobsToRemove map
                registry.blobsToRemove := hashMap.put(registry.blobsToRemove, fileReference.hash, true);
                
                // Remove the file from the registry
                registry.references := pathMap.remove(registry.references, path).0;
            };
        };
    };

    public func getBlobsToRemove(registry : Registry) : [Text] {
        let hashMap = OrderedMap.Make<Text>(Text.compare);
        Iter.toArray(hashMap.keys(registry.blobsToRemove));
    };

    public func clearBlobsRemoved(registry : Registry, hashesToClear : [Text]) : Nat {
        let hashMap = OrderedMap.Make<Text>(Text.compare);
        var updatedBlobsToRemove = registry.blobsToRemove;
        var clearedCount : Nat = 0;
        
        for (hash in hashesToClear.vals()) {
            let (newMap, removed) = hashMap.remove(updatedBlobsToRemove, hash);
            updatedBlobsToRemove := newMap;
            if (removed != null) {
                clearedCount += 1;
            };
        };
        
        registry.blobsToRemove := updatedBlobsToRemove;
        clearedCount;
    };

    // Authorization functions
    public func refreshAuthCache(registry : Registry, cashierPrincipal : Text) : async () {
        let cashier = Principal.fromText(cashierPrincipal);
        let cashierActor = actor(Principal.toText(cashier)) : actor {
            storage_gateway_principal_list_v1 : () -> async [Principal];
        };
        
        registry.authorizedPrincipals := await cashierActor.storage_gateway_principal_list_v1();
    };

    public func requireAuthorized(registry : Registry, caller : Principal, cashierPrincipal : Text) : async () {
        // Initialize cache on first use if empty
        if (registry.authorizedPrincipals.size() == 0) {
            await refreshAuthCache(registry, cashierPrincipal);
        };
        
        let authorized = Array.find<Principal>(registry.authorizedPrincipals, func (p: Principal) : Bool {
            Principal.equal(p, caller)
        }) != null;
        
        if (not authorized) {
            Debug.trap("Unauthorized access");
        };
    };

    public func updateGatewayPrincipals(registry : Registry, cashierPrincipal : Text) : async () {
        await refreshAuthCache(registry, cashierPrincipal);
    };
};
