"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock, Sparkles } from "lucide-react"

// Stitch Components
import { Section } from "@/components/stitch/Section"
import { Container, Grid, Flex } from "@/components/stitch/Layout"
import { Heading, Text } from "@/components/stitch/Typography"
import { CtaBlock } from "@/components/stitch/CtaBlock"
import { Button } from "@/components/ui/button"

// Anti-Gravity Components
import { SmoothTransition } from "@/components/anti-gravity/SmoothTransition"
import { ParallaxLayer } from "@/components/anti-gravity/ParallaxLayer"
import { TiltReveal } from "@/components/anti-gravity/TiltReveal"
import { DepthContainer, DepthLayer } from "@/components/anti-gravity/DepthContainer"

export default function Home() {
  return (
    <main className="min-h-screen bg-site-bg selection:bg-primary/10 transition-colors duration-500 overflow-x-hidden">
      
      {/* Hero Section */}
      <Section padding="xl" className="pt-32 md:pt-48 pb-20 md:pb-32 relative">
        <DepthContainer className="w-full h-full">
          <DepthLayer z={-100} className="opacity-40">
             <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]" />
          </DepthLayer>
          
          <Container className="relative z-10 w-full h-full">
            <SmoothTransition direction="up" distance={40}>
              <CtaBlock
                title={
                  <Flex direction="col" gap="md">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold tracking-wider uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      Founder Built • No Hype
                    </div>
                    <Heading level={1}>
                      Calm <br />
                      <span className="text-primary italic">Consistency.</span>
                    </Heading>
                  </Flex>
                }
                description={
                  <Text variant="lead">
                    The professional scheduler for people who value focus over noise. Show up on LinkedIn every day, without being on LinkedIn every day.
                  </Text>
                }
                actions={
                  <SmoothTransition delay={0.2} distance={20} className="flex justify-center w-full">
                    <TiltReveal>
                      <Link href="/signup">
                        <Button size="lg" className="h-16 px-10 text-lg rounded-full shadow-premium hover:shadow-premium-dark transition-all duration-300">
                          Start for free <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                      </Link>
                    </TiltReveal>
                  </SmoothTransition>
                }
              />
            </SmoothTransition>
          </Container>
        </DepthContainer>
      </Section>

      {/* Value Prop Section */}
      <Section variant="subtle" padding="lg">
        <Container>
          <Grid cols={3} gap="lg">
            <SmoothTransition delay={0.1}>
              <Flex direction="col" align="start" gap="sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Clock className="w-6 h-6" />
                </div>
                <Heading level={4}>Time Recovery</Heading>
                <Text variant="muted">
                  LinkedIn shouldn&apos;t be a daily chore. Batch your thoughts once, let us handle the delivery.
                </Text>
              </Flex>
            </SmoothTransition>

            <SmoothTransition delay={0.2}>
              <Flex direction="col" align="start" gap="sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <Heading level={4}>Pure Reliability</Heading>
                <Text variant="muted">
                  No complex workflows. Just a clean calendar and a dependable publishing engine that never misses.
                </Text>
              </Flex>
            </SmoothTransition>

            <SmoothTransition delay={0.3}>
              <Flex direction="col" align="start" gap="sm">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <Heading level={4}>Pure Intelligence</Heading>
                <Text variant="muted">
                  AI that learns your signature, not one that shouts over it. Refine your thoughts with a partner that understands professional nuance.
                </Text>
              </Flex>
            </SmoothTransition>
          </Grid>
        </Container>
      </Section>

      {/* How it Works */}
      <Section padding="xl">
        <Container size="sm">
          <SmoothTransition className="text-center mb-24">
            <Heading level={2} className="mb-4">How it works.</Heading>
            <Text variant="muted">Three steps to professional consistency.</Text>
          </SmoothTransition>

          <Flex direction="col" gap="xl">
            {[
              { step: "01", title: "Connect", desc: "Link your LinkedIn account securely via OAuth in seconds." },
              { step: "02", title: "Create", desc: "Write your posts or use AI to draft content that sounds like you." },
              { step: "03", title: "Schedule", desc: "Drop posts into your calendar and focus on your actual work." }
            ].map((item, i) => (
              <SmoothTransition key={i} direction="up" delay={i * 0.1} className="w-full">
                <ParallaxLayer offset={20 + (i * 10)} className="w-full">
                  <Flex direction="col" align="start" gap="lg" className="md:flex-row md:items-center w-full">
                    <div className="text-6xl md:text-8xl font-bold text-primary/10 tabular-nums shrink-0">
                      {item.step}
                    </div>
                    <Flex direction="col" align="start" gap="sm">
                      <Heading level={3}>{item.title}</Heading>
                      <Text variant="muted" className="text-xl max-w-sm">
                        {item.desc}
                      </Text>
                    </Flex>
                  </Flex>
                </ParallaxLayer>
              </SmoothTransition>
            ))}
          </Flex>
        </Container>
      </Section>

      {/* Why built different */}
      <Section variant="dark" padding="xl">
        <ParallaxLayer offset={-30}>
          <Container size="sm" className="text-center space-y-12">
            <SmoothTransition>
              <Heading level={2} className="uppercase opacity-90 mx-auto max-w-2xl text-balance">
                Built for focus, not for engagement hacks.
              </Heading>
            </SmoothTransition>
            <SmoothTransition delay={0.2}>
              <Text variant="lead" className="opacity-70 mx-auto text-balance">
                 We don&apos;t use hype. We don&apos;t use gamification. We build tools for founders and builders who have better things to do than refresh their feed.
              </Text>
            </SmoothTransition>
          </Container>
        </ParallaxLayer>
      </Section>

      {/* Who it's for */}
      <Section padding="xl">
        <Container size="sm" className="text-center space-y-16">
          <SmoothTransition>
            <Heading level={3} className="italic font-bold">Perfect for...</Heading>
          </SmoothTransition>
          <SmoothTransition delay={0.2}>
            <Flex className="flex-wrap justify-center w-full" gap="sm">
              {["Solofounders", "Technical Architects", "Quiet Builders", "Executive Leaders", "Digital Gardeners"].map((tag, i) => (
                <ParallaxLayer key={i} offset={Math.random() * 20 - 10} className="inline-block">
                  <span className="px-6 py-3 rounded-full border border-border text-lg font-medium hover:bg-secondary/50 transition-colors cursor-default inline-block">
                    {tag}
                  </span>
                </ParallaxLayer>
              ))}
            </Flex>
          </SmoothTransition>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section padding="xl" className="relative">
        <DepthContainer className="w-full h-full">
          <DepthLayer z={-50} className="pointer-events-none opacity-50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"></div>
          </DepthLayer>

          <Container size="sm" className="relative z-10 w-full h-full">
            <SmoothTransition>
              <CtaBlock
                title={<Heading level={2}>Ready to build your presence, calmly?</Heading>}
                description={<Text variant="small">No credit card required. Connect in 2 minutes.</Text>}
                actions={
                  <>
                    <TiltReveal>
                      <Link href="/signup">
                        <Button size="lg" className="h-16 px-12 text-lg rounded-full w-full">
                          Get started free
                        </Button>
                      </Link>
                    </TiltReveal>
                    <Link href="/login">
                      <Button size="lg" variant="ghost" className="h-16 px-12 text-lg rounded-full font-medium">
                        Sign in
                      </Button>
                    </Link>
                  </>
                }
              />
            </SmoothTransition>
          </Container>
        </DepthContainer>
      </Section>

      <footer className="py-12 px-6 border-t border-border">
        <Container className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="font-bold text-xl tracking-tight uppercase">Linkmate</div>
          <Text variant="small">© 2026 Built for builders.</Text>
        </Container>
      </footer>
    </main>
  )
}

