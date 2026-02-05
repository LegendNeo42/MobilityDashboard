<script lang="ts">
  import { onMount } from "svelte";
  import { loadVehicleRows } from "./lib/data/vehicle";

  let rows = $state<any[] | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      rows = await loadVehicleRows();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });
</script>

{#if error}
  <p>Fehler: {error}</p>
{:else if !rows}
  <p>Lade CSV…</p>
{:else}
  <p>Geladen: {rows.length} Zeilen</p>
  <p>Beispiel: </p>
  <pre>{JSON.stringify(rows[0], null, 2)}</pre>
{/if}

