// Task 6 (a11y): the icon-only buttons of the bulk action bar have an
// accessible name, taken from the same i18n key as their tooltip.
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import BulkAgentActions from '../BulkAgentActions.vue';
import BulkLabelActions from '../BulkLabelActions.vue';
import BulkTeamActions from '../BulkTeamActions.vue';
import BulkUpdateActions from '../BulkUpdateActions.vue';

const store = createStore({
  getters: {
    'inboxAssignableAgents/getUIFlags': () => ({ isFetching: false }),
    'inboxAssignableAgents/getAssignableAgents': () => () => [],
    'bulkActions/getUIFlags': () => ({ isUpdating: false }),
    'teams/getTeams': () => [],
    'labels/getLabels': () => [],
  },
});

const ariaLabelOf = (component, props = {}) => {
  const wrapper = mount(component, {
    props,
    global: {
      plugins: [store],
      directives: { tooltip: {} },
      stubs: { DropdownMenu: true },
    },
  });
  return wrapper.find('button').attributes('aria-label');
};

describe('bulk action bar buttons', () => {
  it.each([
    ['assign agent', BulkAgentActions, { selectedInboxes: [] }],
    ['assign labels', BulkLabelActions, {}],
    ['remove labels', BulkLabelActions, { action: 'remove' }],
    ['change status', BulkUpdateActions, {}],
    ['assign team', BulkTeamActions, {}],
  ])('"%s" has an accessible name', (_name, component, props) => {
    const label = ariaLabelOf(component, props);
    expect(label).toBeTruthy();
    // Resolved text, not a raw i18n key.
    expect(label).not.toMatch(/^[A-Z_.]+$/);
  });
});
