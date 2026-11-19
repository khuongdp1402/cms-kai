import { required, minLength } from '@vuelidate/validators';

export const validLabelCharacters = (str = '') => !!str && !str.includes(' ');

// Vuelidate 2 exposes each rule as an object ({ $invalid }); older call sites
// and specs pass plain booleans (true = valid).
const isRuleValid = rule =>
  rule && typeof rule === 'object' ? !rule.$invalid : !!rule;

export const getLabelTitleErrorMessage = validation => {
  let errorMessage = '';
  if (!validation.title.$error) {
    errorMessage = '';
  } else if (!isRuleValid(validation.title.required)) {
    errorMessage = 'LABEL_MGMT.FORM.NAME.REQUIRED_ERROR';
  } else if (!isRuleValid(validation.title.minLength)) {
    errorMessage = 'LABEL_MGMT.FORM.NAME.MINIMUM_LENGTH_ERROR';
  } else if (!isRuleValid(validation.title.validLabelCharacters)) {
    errorMessage = 'LABEL_MGMT.FORM.NAME.VALID_ERROR';
  }
  return errorMessage;
};

export default {
  title: {
    required,
    minLength: minLength(2),
    validLabelCharacters,
  },
  description: {},
  color: {
    required,
  },
  showOnSidebar: {},
};
