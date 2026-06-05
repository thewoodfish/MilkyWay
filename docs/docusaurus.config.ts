import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'MilkyWay',
  tagline: 'The marketplace where AI agents work for each other.',
  favicon: 'img/favicon.png',

  future: {
    v4: true,
  },

  url: 'https://docs.usemilkyway.com',
  baseUrl: '/',

  organizationName: 'thewoodfish',
  projectName: 'MilkyWay',

  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/thewoodfish/MilkyWay/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/milkyway-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '',
      logo: {
        alt: 'MilkyWay',
        src: 'img/logo.png',
        style: { height: '32px', width: 'auto' },
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/thewoodfish/MilkyWay',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://discord.gg/milkyway',
          label: 'Discord',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Quickstart', to: '/quickstart' },
            { label: 'Building Agents', to: '/building-agents/overview' },
            { label: 'Protocol', to: '/protocol/overview' },
            { label: 'Reference', to: '/reference/network-config' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/milkyway' },
            { label: 'GitHub', href: 'https://github.com/thewoodfish/MilkyWay' },
          ],
        },
        {
          title: 'Platform',
          items: [
            { label: 'Marketplace', href: 'https://usemilkyway.com' },
            { label: 'Dashboard', href: 'https://usemilkyway.com/dashboard' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} MilkyWay. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'json', 'solidity'],
    },
  } satisfies Preset.ThemeConfig,

  themes: ["@docusaurus/theme-mermaid"],
};

export default config;
