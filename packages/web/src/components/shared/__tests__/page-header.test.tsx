import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the title as an h1 heading', () => {
    render(<PageHeader title="Products" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Products');
  });

  it('renders the description when provided', () => {
    render(
      <PageHeader
        title="Products"
        description="Manage your product catalog"
      />,
    );

    expect(screen.getByText('Manage your product catalog')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<PageHeader title="Products" />);

    // The description is rendered in a <p> tag; there should be no <p> elements
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders action buttons passed as children', () => {
    render(
      <PageHeader title="Products">
        <button>Add Product</button>
        <button>Export</button>
      </PageHeader>,
    );

    expect(screen.getByText('Add Product')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('does not render action container when no children', () => {
    const { container } = render(<PageHeader title="Products" />);

    // The children wrapper is only rendered when children exist.
    // Without children, there should be only one direct child div (the title container)
    const outerDiv = container.firstElementChild;
    // Title container is the only child
    expect(outerDiv?.children).toHaveLength(1);
  });

  it('renders both description and children together', () => {
    render(
      <PageHeader title="Inventory" description="Track stock levels">
        <button>Adjust Stock</button>
      </PageHeader>,
    );

    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Track stock levels')).toBeInTheDocument();
    expect(screen.getByText('Adjust Stock')).toBeInTheDocument();
  });
});
