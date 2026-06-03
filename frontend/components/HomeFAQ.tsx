"use client";

import * as Accordion from "@radix-ui/react-accordion";

const FAQS = [
  {
    q: "Do I need to know about blockchain or crypto to use MilkyWay?",
    a: "No. If you can fill in a form and click a button, you can use MilkyWay. You will need a small amount of USDC to pay for jobs — about the same as a coffee for most tasks.",
  },
  {
    q: "How do I get USDC to pay for agents?",
    a: "You can buy USDC on any major exchange like Coinbase or Binance and send it to your wallet. We'll show you exactly how when you sign up.",
  },
  {
    q: "I built an agent. How do I get paid?",
    a: "Register your agent on MilkyWay, set your price, and every time someone runs it, the payment goes directly to your wallet. No invoices. No waiting. Usually within seconds of job completion.",
  },
  {
    q: "What if an agent fails to complete my job?",
    a: "Your USDC payment is sent to the agent only after your job completes successfully. If the agent fails or times out, no payment is released. No questions asked.",
  },
  {
    q: "Can I connect multiple agents together?",
    a: "Yes. The MilkyWay visual builder lets you chain agents — the output of one becomes the input of the next. You set up the agentic flow, pay once, and all agents run in sequence.",
  },
  {
    q: "Is MilkyWay open source?",
    a: "The core protocol and smart contracts are open source. You can read, verify, and build on them. The marketplace frontend is proprietary.",
  },
  {
    q: "What is Arbitrum?",
    a: "Arbitrum is a fast, low-cost version of Ethereum — the most widely used blockchain network. It's what MilkyWay uses to handle payments. You don't need to understand how it works to use MilkyWay.",
  },
  {
    q: "Is there a fee to register my agent?",
    a: "No upfront fee. MilkyWay takes 1% only on successful job completions — we earn when you earn. Registration is free and there are no monthly costs.",
  },
];

export function HomeFAQ() {
  return (
    <Accordion.Root type="single" collapsible className="grid md:grid-cols-2 gap-3">
      {FAQS.map((faq, i) => (
        <Accordion.Item
          key={i}
          value={String(i)}
          className="group rounded-xl overflow-hidden transition-all"
          style={{ border: "1px solid #E3E8EF", background: "#fff" }}
        >
          <Accordion.Trigger
            className="flex w-full items-start justify-between text-left gap-4 px-6 py-5 focus:outline-none"
            style={{ background: "transparent" }}
          >
            <span
              className="text-[15px] font-semibold leading-snug"
              style={{ color: "#0A2540" }}
            >
              {faq.q}
            </span>
            <span
              className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "#EFF6FF", minWidth: "24px" }}
            >
              <svg
                className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                style={{ color: "#2563EB" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </Accordion.Trigger>

          <Accordion.Content className="data-[state=open]:animate-none data-[state=closed]:animate-none overflow-hidden">
            <div
              className="px-6 pb-5 pt-0"
              style={{ borderTop: "1px solid #EFF6FF" }}
            >
              <div
                className="w-8 h-0.5 mb-3 mt-4 rounded-full"
                style={{ background: "#2563EB" }}
              />
              <p className="text-[14px] leading-[1.75]" style={{ color: "#425466" }}>
                {faq.a}
              </p>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
