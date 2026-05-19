import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MasonryGrid from '../components/media/MasonryGrid';

// react-masonry-css needs a DOM environment; it works fine in jsdom.
const makeMedia = (overrides = {}) => ({
  id: Math.random(),
  url: 'https://example.com/photo.jpg',
  thumbnail_url: 'https://example.com/photo.jpg',
  type: 'image',
  title: null,
  tags: [],
  ...overrides,
});

describe('MasonryGrid', () => {
  it('renders "No photos yet." when items array is empty', () => {
    render(<MasonryGrid items={[]} />);
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });

  it('renders one card per item', () => {
    const items = [
      makeMedia({ id: 1, title: 'Photo A' }),
      makeMedia({ id: 2, title: 'Photo B' }),
      makeMedia({ id: 3, title: 'Photo C' }),
    ];
    render(<MasonryGrid items={items} />);
    // Each card renders an img
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(3);
  });
});
