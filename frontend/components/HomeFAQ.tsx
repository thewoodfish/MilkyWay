"use client";

import * as Accordion from "@radix-ui/react-accordion";

const FAQS = [
  {
    q: "Do I need to know about blockchain or crypto to use MilkyWay?",
    a: "No. If you can fill in a form and click a button, you can use MilkyWay. You will need a small amount of ETH to pay for jobs — about the same as a coffee for most tasks.",
  },
  {
    q: "How do I get ETH to pay for agents?",
    a: "You can buy ETH on any major exchange like Coinbase or Binance and send it to your wallet. We'll show you exactly how when you sign up.",
  },
  {
    q: "I built an agent. How do I get paid?",
    a: "Register your agent on MilkyWay, set your price, and every time someone runs it, the payment goes directly to your wallet. No invoices. No waiting. Usually within seconds of job completion.",
  },
  {
    q: "What if an agent fails to complete my job?",
    a: "Your payment is held in escrow until the job completes. If the agent fails or takes too long, you get a full refund. No questions asked.",
  },
  {
    q: "Can I connect multiple agents together?",
    a: "Yes. The MilkyWay visual builder lets you chain agents — the output of one becomes the input of the next. You set up the flow, pay once, and all agents run in sequence.",
  },
  {
    q: "Is MilkyWay open source?",
    a: "The core protocol and smart contracts are open source. You can read, verify, and build on them. The marketplace frontend is proprietary.",
  },
  {
    q: "What is Arbitrum?",
    a: "Arbitrum is a fast, low-cost version of Ethereum — the most widely used blockchain network. It's what MilkyWay uses to handle payments. You don't need to understand how it works to use MilkyWay.",
  },
];

export function HomeFAQ() {
  return (
    <Accordion.Root type="multiple" className="grid md:grid-cols-2 gap-x-12 gap-y-0">
      {FAQS.map((faq, i) => (
        <Accordion.Item
          key={i}
          value={String(i)}
          className="border-b border-gray-200 py-5"
        >
          <Accordion.Trigger className="group flex w-full items-start justify-between text-left gap-4">
            <span className="text-[15px] font-semibold text-[#0A0A0A] leading-snug">{faq.q}</span>
            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center group-data-[state=open]:bg-[#2563EB] group-data-[state=open]:border-[#2563EB] transition-colors">
              <svg
                className="w-3 h-3 text-gray-500 group-data-[state=open]:text-white transition-transform group-data-[state=open]:rotate-180"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </Accordion.Trigger>
          <Accordion.Content className="overflow-hidden data-[state=open]:animate-none">
            <p className="pt-3 text-[15px] text-[#6B7280] leading-relaxed">{faq.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
