<script lang="ts">
  import { listServiceModuleMeta } from '$lib/core/registry/service-modules';
  import { lowercaseFirst } from '$lib/core/registry/types';
  import { appHref } from '$lib/core/util/nav';

  const modules = listServiceModuleMeta();
</script>

<div class="page-header">
  <div>
    <h1>Services</h1>
  </div>
</div>

<div class="service-grid">
  {#each modules as module (module.id)}
    <article class="service-card card">
      <div class="card-header">
        <h2>{module.title}</h2>
        <span class="card-badge push-right">{module.collectionLabel}</span>
      </div>

      <div class="card-body">
        <p class="service-card__desc">{module.description}</p>

        <div class="service-card__actions">
          <a class="btn btn-primary" href={appHref(`/services/${module.id}/new`)}>Create new</a>
          <a class="btn btn-secondary" href={appHref(`/services/${module.id}`)}>View {lowercaseFirst(module.collectionLabel)}</a>
        </div>
      </div>
    </article>
  {/each}
</div>

<style>
  .service-card h2 {
    font-size: 16px;
  }

  .service-card__desc {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--sw-text-secondary);
    line-height: 1.5;
  }
</style>
