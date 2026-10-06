// Preserve existing field notes; append only committed publications from the engine.
(async () => {
  const section = document.getElementById('content919-news');
  const grid = document.getElementById('content919-news-grid');
  if (!section || !grid) return;
  try {
    const response = await fetch('/api/content919/posts');
    if (!response.ok) return;
    const result = await response.json();
    if (!Array.isArray(result.posts) || !result.posts.length) return;
    for (const post of result.posts) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) continue;
      const article = document.createElement('article');
      const wrapper = document.createElement('div');
      const date = document.createElement('small');
      const time = new Date(post.published_at);
      date.textContent = Number.isNaN(time.getTime()) ? 'NEWS & INSIGHTS' : time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
      const title = document.createElement('h2');
      const link = document.createElement('a');
      link.href = '/news/' + post.slug;
      link.textContent = post.title;
      title.append(link);
      const read = document.createElement('a');
      read.href = link.getAttribute('href');
      read.className = 'text-link dark-link';
      read.textContent = 'Read the article →';
      wrapper.append(date, title, read);
      if (post.image_url) {
        const cover = document.createElement('a');
        cover.className = 'news-image';
        cover.href = link.getAttribute('href');
        const image = document.createElement('img');
        image.src = '/api/content919/image/' + post.slug;
        image.alt = post.image_alt || post.title;
        image.width = 1024; image.height = 1024; image.loading = 'lazy';
        cover.append(image); article.append(cover);
      }
      article.append(wrapper);
      grid.append(article);
    }
    section.hidden = !grid.children.length;
  } catch {
    // Existing static resources remain available during a backend outage.
  }
})();
