// Guard: the Vietnamese messages the app actually shows (upstream vi + Kalo
// overlay) must not carry known bad translations from upstream Crowdin.
import en from '../../locale/en';
import vi from '../../locale/vi';
import overrides from '../index';
import { applyLocaleOverrides } from 'shared/helpers/localeOverrides';
import { flatten } from './overlayProblems';

const shown = flatten(applyLocaleOverrides({ vi }, overrides).vi);
const english = flatten(en);

// [rule name, test(viText, enText)]
const RULES = [
  // A JSON "\b" escape in upstream renders a stray control character.
  [
    'control character',
    // eslint-disable-next-line no-control-regex
    text => /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text),
  ],
  ['typo "Trờ về"', text => /Trờ về/.test(text)],
  ['unattended as "Không giám sát"', text => /giám sát/i.test(text)],
  ['snooze as "Báo lại"', text => /^Báo lại$/.test(text)],
  // "agent" is a shop employee, not a dealer or a vendor.
  ['agent as "đại lý"', text => /đại lý/i.test(text)],
  // Literal machine translations the new-shop QA flagged (T6a).
  ['"Sao Chép" with a capital C', text => /Sao Chép/.test(text)],
  ['"sẵn sàng để đi"', text => /sẵn sàng để đi/i.test(text)],
  ['"Đưa cho tôi"', text => /Đưa cho tôi/.test(text)],
  ['sample company "Acme"', text => /Acme/.test(text)],
  [
    'agent or inbox as "nhà cung cấp"',
    (text, enText) =>
      /nhà cung cấp/i.test(text) && !/provider/i.test(enText || ''),
  ],
];

const problems = Object.entries(shown).flatMap(([key, text]) =>
  typeof text === 'string'
    ? RULES.filter(([, test]) => test(text, english[key])).map(
        ([name]) => `${key}: ${name}`
      )
    : []
);

describe('Vietnamese terms shown in the app', () => {
  it('has no known bad translations', () => {
    expect(problems).toEqual([]);
  });

  it.each([
    ['CHAT_LIST.UNATTENDED_HEADING', 'Chưa trả lời'],
    ['BULK_ACTION.UPDATE.SNOOZE_UNTIL', 'Hoãn'],
    ['INBOX_MGMT.ADD.AGENTS.TITLE', 'Nhân viên'],
    ['CONVERSATION.MENTION.AGENTS', 'Nhân viên'],
    ['CONTACT_FORM.FORM.COUNTRY.PLACEHOLDER', 'Nhập tên quốc gia'],
    ['CANNED_MGMT.ADD.FORM.SUBMIT', 'Lưu'],
    ['CANNED_MGMT.EDIT.FORM.SUBMIT', 'Lưu'],
  ])('%s reads "%s"', (key, expected) => {
    expect(shown[key]).toBe(expected);
  });
});
