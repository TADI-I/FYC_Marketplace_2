import { fireEvent, render, screen } from '@testing-library/react';
import HowItWorksPage from './HowItWorksPage';

describe('HowItWorksPage', () => {
  it('explains the current buyer and seller journeys', () => {
    render(<HowItWorksPage onBack={jest.fn()} onRegister={jest.fn()} />);

    expect(screen.getByRole('heading', { name: /safe campus handover/i })).toBeInTheDocument();
    expect(screen.getByText(/orders them from closest to furthest/i)).toBeInTheDocument();
    expect(screen.getByText(/unread in-app messages trigger an email reminder after ten minutes/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /browse free\. sell for r25 monthly/i })).toBeInTheDocument();
  });

  it('connects the marketplace and registration actions', () => {
    const onBack = jest.fn();
    const onRegister = jest.fn();
    render(<HowItWorksPage onBack={onBack} onRegister={onRegister} />);

    fireEvent.click(screen.getByRole('button', { name: 'Browse marketplace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRegister).toHaveBeenCalledTimes(1);
  });
});
