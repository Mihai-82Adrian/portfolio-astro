<script lang="ts">
  import { AI_PRIVACY_NOTICE_VERSION } from '../../../../functions/_lib/ai-privacy-notice.ts';

  let {
    privacyPolicyUrl = '/datenschutz',
    checked = $bindable(false),
    id = 'ai-consent-checkbox',
    showFinancialWarning = false,
  }: {
    privacyPolicyUrl?: string;
    checked?: boolean;
    id?: string;
    showFinancialWarning?: boolean;
  } = $props();

  let showError = $state(false);
  let checkboxEl: HTMLInputElement | undefined = $state();

  // Called by the parent's action handler before building the AI request. Returns whether the
  // action may proceed. On failure, shows an accessible error and focuses the checkbox instead of
  // silently doing nothing — the button itself is never disabled just because consent is missing.
  export function requireConsent(): boolean {
    if (checked) {
      showError = false;
      return true;
    }
    showError = true;
    checkboxEl?.focus();
    return false;
  }

  $effect(() => {
    if (checked) showError = false;
  });

  const errorId = `${id}-error`;
</script>

<div class="mb-3 rounded-xl border border-eucalyptus-500/25 bg-eucalyptus-500/5 p-3">
  {#if showFinancialWarning}
    <p class="mb-2 text-xs font-medium leading-relaxed text-text-secondary-light dark:text-text-secondary-dark">
      Verwenden Sie keine echten Steuer-, Konto-, Gehalts-, Kunden- oder vertraulichen
      Unternehmensdaten.
    </p>
  {/if}
  <label for={id} class="flex cursor-pointer items-start gap-2 text-xs text-text-primary-light dark:text-text-primary-dark">
    <input
      {id}
      type="checkbox"
      bind:checked
      bind:this={checkboxEl}
      data-ai-privacy-notice-version={AI_PRIVACY_NOTICE_VERSION}
      aria-describedby={showError ? errorId : undefined}
      aria-invalid={showError ? 'true' : undefined}
      class="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 text-eucalyptus-600 focus-visible:ring-2 focus-visible:ring-eucalyptus-500 dark:border-white/20"
    />
    <span>
      Ich stimme zu, dass meine Eingabe und die KI-generierte Antwort an OpenAI übermittelt werden.
      Für dieses Projekt ist die freiwillige Weitergabe von API-Eingaben und -Ausgaben an OpenAI
      aktiviert. OpenAI kann diese Daten zur Qualitätsbewertung sowie zur Verbesserung und zum
      Training seiner Modelle verwenden. Bitte geben Sie keine sensiblen, vertraulichen oder
      personenbezogenen Daten über sich oder Dritte ein. Verwenden Sie nach Möglichkeit
      anonymisierte oder synthetische Angaben. Die KI-Funktion ist optional.
      <a
        href={privacyPolicyUrl}
        class="underline decoration-eucalyptus-600/50 hover:text-eucalyptus-700 dark:hover:text-eucalyptus-300"
      >
        Mehr dazu in der Datenschutzerklärung
      </a>.
    </span>
  </label>
  {#if showError}
    <p id={errorId} role="alert" class="mt-1 text-xs text-red-600 dark:text-red-400">
      Bitte bestätige zuerst die Zustimmung zur externen Verarbeitung oben.
    </p>
  {/if}
</div>
