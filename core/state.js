// Create new file: src/core/state.js

export class AppState {
  constructor() {
    this.state = {
      wallet: {
        connected: false,
        account: null,
        network: null,
        signer: null,
        provider: null,
      },
      contracts: {
        token: null,
        vesting: null,
        tokenAddress: null,
        vestingAddress: null,
        vestingOwner: null,
      },
      data: {
        balance: null,
        totalSupply: null,
        votingPower: null,
        delegates: null,
        nonce: null,
        name: null,
        symbol: null,
        decimals: null,
        // Vesting data
        vestingStart: null,
        vestingEnd: null,
        vestingReleased: null,
        vestingReleasable: null,
        unvestedBalance: null,
        vestingStarted: null,
      },
      ui: {
        loading: new Set(),
        isVestingMode: false,
      },
    };

    this.listeners = new Map();
  }

  // Subscribe to state changes
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Set state value and notify listeners
  setState(path, value) {
    const keys = path.split(".");
    let current = this.state;

    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;

    // Notify listeners if value changed
    if (oldValue !== value) {
      this.notifyListeners(path, value, oldValue);
    }
  }

  // Get state value
  getState(path) {
    const keys = path.split(".");
    let current = this.state;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  // Notify all listeners for a path
  notifyListeners(path, newValue, oldValue) {
    const callbacks = this.listeners.get(path);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in state listener for ${path}:`, error);
        }
      });
    }
  }

  // Helper method to set loading state
  setLoading(operation, isLoading) {
    const loadingSet = this.getState("ui.loading");
    if (isLoading) {
      loadingSet.add(operation);
    } else {
      loadingSet.delete(operation);
    }
    this.setState("ui.loading", loadingSet);
  }

  // Helper method to check if operation is loading
  isLoading(operation) {
    return this.getState("ui.loading").has(operation);
  }
}

// Create singleton instance
export const appState = new AppState();
