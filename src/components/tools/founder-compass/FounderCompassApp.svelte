<script lang="ts">
  import { onMount } from 'svelte';
  import QuizStep from './QuizStep.svelte';
  import ConsentStep from './ConsentStep.svelte';
  import ReportView from './ReportView.svelte';
  import { QUESTIONS } from './questions';
  import { createEmptyAnswers, type CompassState } from '@/lib/founder-compass/types';

  const STORAGE_KEY = 'tools.founder-compass.state.v1';
  const TOTAL = QUESTIONS.length;

  // ── State ────────────────────────────────────────────────────────
  let currentStep = $state(0);
  let answers = $state(createEmptyAnswers(QUESTIONS));
  let status = $state<CompassState['status']>('idle');
  let report = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  let restored = $state(false);

  // ── Derived ──────────────────────────────────────────────────────
  let phase = $derived<'quiz' | 'consent' | 'report'>(
    currentStep < TOTAL ? 'quiz' : currentStep === TOTAL ? 'consent' : 'report'
  );

  let currentQuestion = $derived(
    currentStep < TOTAL ? QUESTIONS[currentStep] : null
  );

  // ── Lifecycle ────────────────────────────────────────────────────
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<CompassState>;
        if (Array.isArray(p.answers) && p.answers.length === TOTAL) {
          answers = p.answers;
        }
        if (typeof p.currentStep === 'number') {
          currentStep = p.currentStep;
        }
        if (p.report) {
          report = p.report;
        }
        if (p.status === 'complete') {
          status = 'complete';
        }
      }
    } catch { /* ignore */ }
    restored = true;
  });

  // Persist on every meaningful change
  $effect(() => {
    if (!restored) return;
    const snapshot: Partial<CompassState> = {
      currentStep,
      answers,
      status: status === 'streaming' || status === 'submitting' ? 'in-progress' : status,
      report,
      errorMessage: null,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch { /* ignore */ }
  });

  // ── Navigation ───────────────────────────────────────────────────
  function goNext() {
    if (currentStep < TOTAL) {
      currentStep++;
    }
  }

  function goBack() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  // ── Submit & Stream ──────────────────────────────────────────────
  async function handleSubmit() {
    status = 'submitting';
    errorMessage = null;
    report = '';
    currentStep = TOTAL + 1; // Show report view

    try {
      const payload = answers.map((a) => {
        const q = QUESTIONS.find((q) => q.id === a.questionId);
        return {
          dimension: q?.dimension ?? a.questionId,
          selectedKey: a.selectedKey,
          selectedLabel:
            a.selectedKey === 'custom'
              ? null
              : q?.options.find((o) => o.key === a.selectedKey)?.label ?? null,
          customText: a.selectedKey === 'custom' ? a.customText : '',
        };
      });

      const res = await fetch('/api/compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Serverfehler' }));
        throw new Error(
          (err as { error?: string }).error || `HTTP ${res.status}`
        );
      }

      const contentType = res.headers.get('Content-Type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        status = 'streaming';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const segments = buffer.split('\n\n');
          buffer = segments.pop() || '';

          for (const segment of segments) {
            if (!segment.trim()) continue;

            let eventType = '';
            let eventData = '';

            for (const line of segment.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7).trim();
              else if (line.startsWith('data: ')) eventData = line.slice(6).trim();
            }

            if (!eventData) continue;

            try {
              const parsed = JSON.parse(eventData);

              if (eventType === 'delta' && parsed.text) {
                report = (report || '') + parsed.text;
              } else if (eventType === 'error') {
                throw new Error(parsed.error || 'Stream-Fehler');
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Stream-Fehler') {
                // Skip malformed JSON
              } else {
                throw e;
              }
            }
          }
        }

        status = 'complete';
      } else {
        // Non-streaming fallback
        const data = await res.json();
        report = (data as { report?: string }).report || 'Kein Ergebnis generiert.';
        status = 'complete';
      }
    } catch (e) {
      status = 'error';
      errorMessage =
        e instanceof Error ? e.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    }
  }

  // ── Reset ────────────────────────────────────────────────────────
  function handleRestart() {
    currentStep = 0;
    answers = createEmptyAnswers(QUESTIONS);
    status = 'idle';
    report = null;
    errorMessage = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }
</script>

<div class="space-y-4">
  <!-- Header bar -->
  <div class="flex items-center justify-between">
    <p class="text-xs text-text-muted-light dark:text-text-muted-dark">
      Daten werden lokal gespeichert — Auswertung via KI-Dienst.
    </p>
    {#if phase === 'quiz' && currentStep > 0}
      <button
        type="button"
        onclick={handleRestart}
        class="text-xs text-text-muted-light underline-offset-2 hover:text-red-500 hover:underline dark:text-text-muted-dark transition-colors"
      >
        Zurücksetzen
      </button>
    {/if}
  </div>

  <!-- Quiz steps -->
  {#if phase === 'quiz' && currentQuestion}
    {#key currentStep}
      <QuizStep
        questionNumber={currentStep + 1}
        totalQuestions={TOTAL}
        title={currentQuestion.title}
        body={currentQuestion.body}
        options={currentQuestion.options}
        bind:selectedKey={answers[currentStep].selectedKey}
        bind:customText={answers[currentStep].customText}
        onNext={goNext}
        onBack={goBack}
      />
    {/key}
  {/if}

  <!-- Consent step -->
  {#if phase === 'consent'}
    <ConsentStep
      {answers}
      onSubmit={handleSubmit}
      onBack={goBack}
      submitting={status === 'submitting'}
    />
  {/if}

  <!-- Report view -->
  {#if phase === 'report'}
    <ReportView
      report={report || ''}
      {status}
      {errorMessage}
      onRestart={handleRestart}
    />
  {/if}
</div>
