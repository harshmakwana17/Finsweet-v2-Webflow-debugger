import { filterRules } from './filter.rules';
import { globalRules } from './global.rules';
import { listCommonRules } from './list-common.rules';
import { loadRules } from './load.rules';
import { solutionRules } from './solutions.rules';
import { sortRules } from './sort.rules';
import type { Rule } from '../core/types';

export const rules: Rule[] = [
  ...globalRules,
  ...listCommonRules,
  ...filterRules,
  ...sortRules,
  ...loadRules,
  ...solutionRules,
];

export const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
