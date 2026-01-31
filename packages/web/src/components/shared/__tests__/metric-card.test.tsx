import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../metric-card';
import { DollarSign, TrendingUp } from 'lucide-react';

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(
      <MetricCard title="Total Sales" value="Rp 1.500.000" icon={DollarSign} />,
    );

    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    const { container } = render(
      <MetricCard title="Revenue" value="Rp 500.000" icon={DollarSign} />,
    );

    // Lucide icons render as SVG elements
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <MetricCard
        title="Orders"
        value="125"
        icon={DollarSign}
        description="+12% from last month"
      />,
    );

    expect(screen.getByText('+12% from last month')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(
      <MetricCard title="Orders" value="125" icon={DollarSign} />,
    );

    expect(screen.queryByText('+12% from last month')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MetricCard
        title="Test"
        value="100"
        icon={DollarSign}
        className="custom-class"
      />,
    );

    // The Card component is the outer wrapper; it should receive the className
    const card = container.firstElementChild;
    expect(card?.className).toContain('custom-class');
  });

  it('renders with a different icon', () => {
    const { container } = render(
      <MetricCard title="Transactions" value="42" icon={TrendingUp} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('renders description as trend indicator text', () => {
    render(
      <MetricCard
        title="Revenue"
        value="Rp 10.000.000"
        icon={DollarSign}
        description="-5% from last week"
      />,
    );

    expect(screen.getByText('-5% from last week')).toBeInTheDocument();
  });

  it('renders value as formatted currency string', () => {
    render(
      <MetricCard title="Sales" value="Rp 0" icon={DollarSign} />,
    );

    expect(screen.getByText('Rp 0')).toBeInTheDocument();
  });

  it('renders title, value, icon, and description together', () => {
    const { container } = render(
      <MetricCard
        title="Customers"
        value="1,234"
        icon={TrendingUp}
        description="+8% growth"
      />,
    );

    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('+8% growth')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
