import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MediaCard from '../components/media/MediaCard';

// Mock the API client so ContentModal's fetch doesn't fire in tests.
vi.mock('../api/client', () => ({
  default: { get: vi.fn(() => new Promise(() => {})) }, // never resolves
  API_BASE: '/api',
}));

const base = {
  id: 1,
  url: 'https://example.com/photo.jpg',
  thumbnail_url: 'https://example.com/photo.jpg',
  type: 'image',
  title: 'Test Photo',
  tags: [],
};

describe('MediaCard', () => {
  it('renders a thumbnail image', () => {
    render(<MediaCard media={base} />);
    expect(screen.getByRole('img', { name: 'Test Photo' })).toBeInTheDocument();
  });

  it('does NOT show play icon for image type', () => {
    const { container } = render(<MediaCard media={base} />);
    // Play polygon only present for video
    expect(container.querySelector('polygon')).toBeNull();
  });

  it('shows play icon overlay for video type', () => {
    const { container } = render(<MediaCard media={{ ...base, type: 'video' }} />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('shows carousel stacked icon for carousel type', () => {
    const { container } = render(
      <MediaCard media={{ ...base, type: 'carousel', carousel_id: 42 }} />
    );
    // CarouselIcon uses rect elements
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('opens ContentModal when clicked', () => {
    const { container } = render(<MediaCard media={base} />);
    const card = container.firstChild;
    fireEvent.click(card);
    // Modal is fixed overlay — check it exists in DOM
    expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
  });
});
