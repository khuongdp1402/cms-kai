// Vuex getters for specs that mount code reading kalo_* flags
// (useKaloFeatures). `features` is the account payload; null turns every flag on.
export const kaloFeatureGetters = (features = null) => ({
  getCurrentAccountId: () => 1,
  'accounts/getAccount': () => id => ({ id, features: features || {} }),
  'accounts/isFeatureEnabledonAccount': () => (_id, name) =>
    features ? Boolean(features[name]) : true,
});
