import type { ReactNode } from 'react';
import { Box, Container, Divider, Paper, Typography } from '@mui/material';
import {
  BigPictureDiagram,
  CheckpointDiagram,
  CursorVsOffsetDiagram,
  ParallelVsSequentialDiagram,
  PatientsFirstDiagram,
  RateLimitDiagram,
  RetryDiagram,
  TwoSystemsDiagram,
} from '../components/diagrams/HowItWorksDiagrams';

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

// Plain-language explainer, written for anyone using the app — not developers. No internal names,
// tables, or function references; the diagrams (components/diagrams/HowItWorksDiagrams.tsx) carry
// as much of the explanation as the words do. Normal page flow, no viewport-height lock — that
// pattern belongs only to the Patients table page (sticky header, scrollable body), not here.
export function HowItWorksPage() {
  return (
    <Container maxWidth="md" sx={{ pb: 6 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, mt: 1 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          How syncing works
        </Typography>
        <Typography color="text.secondary">
          Every time a sync runs, it's really three separate jobs: a{' '}
          <strong>Patients Resource Sync</strong>, a <strong>Conditions Resource Sync</strong>, and
          a <strong>Medication Requests Sync</strong>. Together they connect to an outside health
          record system — today that's <strong>HAPI FHIR</strong> or <strong>Oracle Health</strong>{' '}
          — and copy that information into our own database, safely and without losing anything
          along the way.
        </Typography>

        <BigPictureDiagram />

        <Divider />

        <Section title="The Patients Resource Sync always goes first">
          <Typography>
            Before the Conditions and Medication Requests Syncs can look anyone up, they need to
            know who the patients are — the same way you'd need an address book before sending out
            mail. So every run starts with the Patients Resource Sync, and only once it's found
            everyone do the other two start — at that point, both run at the same time.
          </Typography>
          <PatientsFirstDiagram />
        </Section>

        <Divider />

        <Section title="Never starting from scratch">
          <Typography>
            Each of the three syncs saves its progress continuously, not just at the end. If one
            gets interrupted — a server restart, a network hiccup, anything — it doesn't start over.
            It picks up from the last point it had already saved, the way a video game resumes from
            your last checkpoint instead of sending you back to the title screen.
          </Typography>
          <CheckpointDiagram />
        </Section>

        <Divider />

        <Section title="When something doesn't work the first time">
          <Typography>
            Requests to HAPI FHIR or Oracle Health sometimes fail — a slow connection, a busy
            server. When that happens, none of the three syncs give up immediately. A quick
            automatic retry happens up to 3 times right away; if it's still not working, the sync
            waits a bit and tries 2 more times. Only after all of that does something get flagged
            for a person to look at.
          </Typography>
          <RetryDiagram />
        </Section>

        <Divider />

        <Section title="Conditions and Medication Requests run side by side">
          <Typography>
            The Conditions Resource Sync and the Medication Requests Sync used to take turns,
            sharing one line of work even though they have nothing to do with each other. That was
            fixed — they now each get their own line and run at the same time, so a sync of hundreds
            of patients finishes in minutes instead of taking twice as long for no real reason.
          </Typography>
          <ParallelVsSequentialDiagram />
        </Section>

        <Divider />

        <Section title="HAPI FHIR and Oracle Health behave differently">
          <Typography>
            HAPI FHIR can be asked "just show me what's changed recently," so the Patients,
            Conditions, and Medication Requests Syncs can do quick, cheap re-checks. Oracle Health's
            public test system can't answer that question at all — every run has to look at every
            matching patient again from the start. It also can't be asked about many patients in one
            go, only one at a time, so the Conditions and Medication Requests Syncs work through
            Oracle Health's patients in small groups of about 10 instead.
          </Typography>
          <TwoSystemsDiagram />
        </Section>

        <Divider />

        <Section title="Turning the page safely">
          <Typography>
            All three syncs read long lists a chunk at a time, and there are two ways to ask for
            "the next 50." You can ask by position — "give me items 51 to 100" — which sounds
            simple, but if something in the list changes while you're reading, everything after it
            shifts, and you can silently skip an item or see one twice without ever knowing it
            happened. Instead, each sync asks by bookmark — "give me everything after this exact
            item I last saw." A bookmark doesn't move just because something changed elsewhere in
            the list, so nothing gets missed.
          </Typography>
          <CursorVsOffsetDiagram />
          <Typography sx={{ mt: 2 }}>
            The bookmark only promises one thing: that a single run won't skip or repeat anything
            while it's working through the list. It doesn't promise catching something created at
            the exact moment a sync is mid-walk — that's a separate job. For HAPI FHIR, each sync
            also remembers when it last finished successfully, so anything new or changed since then
            gets picked up automatically the next time it runs — the bookmark keeps one run honest,
            remembering the last successful run is what keeps things honest over time. Oracle Health
            can't answer "what's new since," which is exactly why its syncs re-check everyone from
            scratch on every run instead.
          </Typography>
          <Typography sx={{ mt: 2 }}>
            And if the same record ever does come back twice anyway — an overlapping page, a retried
            request, an entire re-run — that's still not a problem. Every record carries its own
            permanent ID from the outside system, and the sync always checks that ID before saving
            anything. Seeing the same one again just updates the existing copy in place; it never
            creates a duplicate.
          </Typography>
        </Section>

        <Divider />

        <Section title="Why going faster isn't always better">
          <Typography>
            It's tempting to think "more requests at once = done sooner," but HAPI FHIR and Oracle
            Health are shared systems with limited capacity — not built to handle unlimited traffic.
            Push too hard and they slow down or start timing out, which triggers more retries, which
            adds even more load — the opposite of what you wanted. So the Patients, Conditions, and
            Medication Requests Syncs all share one speed limit per outside system, no matter how
            much work is technically ready to run at once.
          </Typography>
          <RateLimitDiagram />
        </Section>
      </Paper>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 2 }}
      >
        Reflects how syncing actually behaves today — worth a look whenever that changes.
      </Typography>
    </Container>
  );
}
