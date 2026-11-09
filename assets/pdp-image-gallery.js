import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

class CustomMediaGallery extends Component {
  requiredRefs = ['track', 'slides'];

  #controller = new AbortController();
  #observer;
  #index = 0;

  connectedCallback() {
    super.connectedCallback();
    const { signal } = this.#controller;

    this.#observer = new IntersectionObserver(this.#handleIntersect, { root: this.refs.track, threshold: 0.6 });
    for (const slide of this.refs.slides) this.#observer.observe(slide);

    this.closest('.shopify-section')?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, {
      signal,
    });

    this.#scrollTo(Number(this.dataset.startIndex) || 0, 'instant');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#controller.abort();
    this.#observer?.disconnect();
  }

  next() {
    this.goTo(this.#index + 1);
  }

  previous() {
    this.goTo(this.#index - 1);
  }

  /** @param {number} index */
  goTo(index) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#scrollTo(index, reduceMotion ? 'instant' : 'smooth');
  }

  /** @param {number} index */
  openZoom(index) {
    const { zoomDialog, zoomSlides } = this.refs;
    if (!zoomDialog) return;

    zoomDialog.showModal();
    zoomSlides?.[index]?.scrollIntoView({ block: 'start' });
  }

  closeZoom() {
    this.refs.zoomDialog?.close();
  }

  #scrollTo(index, behavior) {
    const { track, slides } = this.refs;
    const slide = slides[Math.max(0, Math.min(index, slides.length - 1))];

    track.scrollTo({ left: slide.offsetLeft, behavior });
  }

  #handleIntersect = (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) this.#setActive(this.refs.slides.indexOf(entry.target));
    }
  };

  #setActive(index) {
    this.#index = index;
    const { slides, thumbnails = [], dots = [], thumbnailList, previous, next } = this.refs;

    for (const list of [thumbnails, dots]) {
      list.forEach((control, i) => control.setAttribute('aria-current', String(i === index)));
    }

    // Keep the active thumbnail in view without scrolling the page
    const thumbnail = thumbnails[index];
    if (thumbnail && thumbnailList) {
      thumbnailList.scrollTo({
        left: thumbnail.offsetLeft - (thumbnailList.clientWidth - thumbnail.clientWidth) / 2,
        behavior: 'smooth',
      });
    }

    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;

    // Stop a video playing on a slide the customer has moved away from
    slides.forEach((slide, i) => {
      if (i !== index) slide.querySelector('video')?.pause();
    });
  }

  #handleVariantUpdate = (event) => {
    const mediaId = event.detail.resource?.featured_media?.id;
    if (!mediaId) return;

    const index = this.refs.slides.findIndex((slide) => slide.dataset.mediaId === String(mediaId));
    if (index !== -1) this.goTo(index);
  };
}

if (!customElements.get('custom-media-gallery')) {
  customElements.define('custom-media-gallery', CustomMediaGallery);
}
