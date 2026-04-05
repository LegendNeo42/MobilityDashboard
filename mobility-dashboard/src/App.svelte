<script lang="ts">
  import AppShell from "./app/AppShell.svelte";
  import DashboardFilterBar from "./features/dashboard-filters/DashboardFilterBar.svelte";
  import VehicleUsageSection from "./features/vehicle-usage/VehicleUsageSection.svelte";
</script>

<AppShell>
  <DashboardFilterBar />
  <VehicleUsageSection />
</AppShell>