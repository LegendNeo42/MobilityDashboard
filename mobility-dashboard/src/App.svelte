<script lang="ts">
  import AppShell from "./app/AppShell.svelte";
  import { dashboardContent } from "./content/dashboard";
  import DashboardFilterBar from "./features/dashboard-filters/DashboardFilterBar.svelte";
  import VehicleUsageSection from "./features/vehicle-usage/VehicleUsageSection.svelte";
</script>

<AppShell>
  <section id="overview" class="dashboardSection">
    <div class="sectionHeader">
      <p class="sectionEyebrow">{dashboardContent.overviewSection.eyebrow}</p>
      <h2>{dashboardContent.overviewSection.title}</h2>
      <p class="sectionText">{dashboardContent.overviewSection.text}</p>
    </div>

    <div class="overviewGrid">
      {#each dashboardContent.overviewSection.cards as card}
        <article class="panel overviewCard">
          <h3>{card.title}</h3>
          <p>{card.text}</p>
        </article>
      {/each}
    </div>
  </section>

  <DashboardFilterBar />

  <section id="analysis" class="dashboardSection">
    <div class="sectionHeader">
      <p class="sectionEyebrow">{dashboardContent.analysisSection.eyebrow}</p>
      <h2>{dashboardContent.analysisSection.title}</h2>
      <p class="sectionText">{dashboardContent.analysisSection.text}</p>
    </div>

    <VehicleUsageSection />
  </section>

  <section id="region" class="dashboardSection">
    <div class="sectionHeader">
      <p class="sectionEyebrow">{dashboardContent.regionSection.eyebrow}</p>
      <h2>{dashboardContent.regionSection.title}</h2>
      <p class="sectionText">{dashboardContent.regionSection.text}</p>
    </div>

    <div class="panel placeholderPanel">
      <ul class="placeholderList">
        {#each dashboardContent.regionSection.bullets as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
  </section>

  <section id="context" class="dashboardSection">
    <div class="sectionHeader">
      <p class="sectionEyebrow">{dashboardContent.contextSection.eyebrow}</p>
      <h2>{dashboardContent.contextSection.title}</h2>
      <p class="sectionText">{dashboardContent.contextSection.text}</p>
    </div>

    <div class="panel placeholderPanel">
      <ul class="placeholderList">
        {#each dashboardContent.contextSection.bullets as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
  </section>
</AppShell>