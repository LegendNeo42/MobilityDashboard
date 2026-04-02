<script lang="ts">
  import { dashboardContent } from "../content/dashboard";
</script>

<div class="appShell">
  <header class="hero">
    <p class="heroEyebrow">Universität Regensburg</p>
    <h1>{dashboardContent.title}</h1>
    <p class="heroSubtitle">{dashboardContent.subtitle}</p>
    <p class="heroText">{dashboardContent.intro}</p>
  </header>

  <main class="dashboardMain">
    <slot />
  </main>
</div>