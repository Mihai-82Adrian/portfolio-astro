<script lang="ts">
  let { privacyPolicyUrl = '/datenschutz' }: { privacyPolicyUrl?: string } = $props();
</script>

<p class="mb-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
  Bei Klick werden deine Eingaben zur Auswertung an OpenAI (USA) übermittelt und nicht
  dauerhaft gespeichert (<code>store: false</code>).
  <a
    href={privacyPolicyUrl}
    class="underline decoration-eucalyptus-600/50 hover:text-eucalyptus-700 dark:hover:text-eucalyptus-300"
  >
    Mehr dazu in der Datenschutzerklärung
  </a>.
</p>
