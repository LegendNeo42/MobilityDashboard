<script lang="ts">
  import AppShell from "./app/AppShell.svelte";
  import { dashboardContent } from "./content/dashboard";
  import DashboardFilterBar from "./features/dashboard-filters/DashboardFilterBar.svelte";
  import SurveyOverviewSummary from "./features/survey-metadata/SurveyOverviewSummary.svelte";
  import SurveyTransparencySection from "./features/survey-metadata/SurveyTransparencySection.svelte";
  import VehicleUsageSection from "./features/vehicle-usage/VehicleUsageSection.svelte";
  import ModalSplitByDistanceSection from "./features/modal-split-distance/ModalSplitByDistanceSection.svelte";
  import PublicTransportBarriersSection from "./features/public-transport-barriers/PublicTransportBarriersSection.svelte";
  import PublicTransportImprovementsSection from "./features/public-transport-improvements/PublicTransportImprovementsSection.svelte";
  import BicycleImprovementsSection from "./features/bicycle-improvements/BicycleImprovementsSection.svelte";
  import QualitativeThemeSummarySection from "./features/qualitative-feedback/QualitativeThemeSummarySection.svelte";
  import PlzRegionSection from "./features/plz-map/PlzRegionSection.svelte";
</script>

<AppShell>
  <section id="overview" class="dashboardSection dashboardSection--overview">
    <div class="sectionHeader">
      <p class="sectionEyebrow">{dashboardContent.overviewSection.eyebrow}</p>
      <h2>{dashboardContent.overviewSection.title}</h2>
      <p class="sectionText">{dashboardContent.overviewSection.text}</p>
    </div>

    <SurveyOverviewSummary />
  </section>

  <div class="analysisWorkspace">
    <DashboardFilterBar />

    <div class="analysisContentStack">
      <section id="analysis" class="dashboardSection dashboardSection--analysis">
        <div class="sectionHeader">
          <p class="sectionEyebrow">{dashboardContent.analysisSection.eyebrow}</p>
          <h2>{dashboardContent.analysisSection.title}</h2>
          <p class="sectionText">{dashboardContent.analysisSection.text}</p>
        </div>

        <VehicleUsageSection />

        <div id="distance" class="sectionAnchor"></div>
        <ModalSplitByDistanceSection />

        <div id="reasons" class="sectionAnchor"></div>
        <PublicTransportBarriersSection />
        <PublicTransportImprovementsSection />
        <BicycleImprovementsSection />

        <div id="qualitative" class="sectionAnchor"></div>
        <QualitativeThemeSummarySection />
      </section>

      <section id="region" class="dashboardSection dashboardSection--region">
        <div class="sectionHeader">
          <p class="sectionEyebrow">{dashboardContent.regionSection.eyebrow}</p>
          <h2>{dashboardContent.regionSection.title}</h2>
          <p class="sectionText">{dashboardContent.regionSection.text}</p>
        </div>

        <PlzRegionSection />
      </section>
    </div>
  </div>

  <section id="context" class="dashboardSection dashboardSection--context">
    <div class="sectionHeader">
      <p class="sectionEyebrow">{dashboardContent.contextSection.eyebrow}</p>
      <h2>{dashboardContent.contextSection.title}</h2>
      <p class="sectionText">{dashboardContent.contextSection.text}</p>
    </div>

    <SurveyTransparencySection />
  </section>
</AppShell>