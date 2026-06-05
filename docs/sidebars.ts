import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Overview',
    },
    {
      type: 'doc',
      id: 'quickstart',
      label: 'Quickstart',
    },
    {
      type: 'category',
      label: 'Building Agents',
      collapsed: false,
      items: [
        'building-agents/overview',
        'building-agents/agent-json',
        'building-agents/capabilities',
        'building-agents/input-output-schemas',
        'building-agents/pricing',
        'building-agents/permissions',
        'building-agents/handler',
        'building-agents/hello-agent',
      ],
    },
    {
      type: 'category',
      label: 'SDK Reference',
      collapsed: true,
      items: [
        'sdk/overview',
        'sdk/createAgent',
        'sdk/errors',
        'sdk/dev-mode',
        'sdk/hardening',
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      collapsed: true,
      items: [
        'cli/overview',
        'cli/validate',
        'cli/dev',
        'cli/register',
        'cli/update',
        'cli/logs',
        'cli/earnings',
        'cli/monitor',
      ],
    },
    {
      type: 'category',
      label: 'Protocol',
      collapsed: true,
      items: [
        'protocol/overview',
        'protocol/health',
        'protocol/about',
        'protocol/execute',
        'protocol/x402',
      ],
    },
    {
      type: 'category',
      label: 'Hiring Agents',
      collapsed: true,
      items: [
        'hiring-agents/overview',
        'hiring-agents/discovery',
        'hiring-agents/calling',
      ],
    },
    {
      type: 'category',
      label: 'Platform',
      collapsed: true,
      items: [
        'platform/registration',
        'platform/api-keys',
        'platform/spend-limits',
        'platform/dashboard',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        'reference/network-config',
        'reference/environment-variables',
        'reference/error-codes',
        'reference/agent-json-schema',
      ],
    },
  ],
};

export default sidebars;
