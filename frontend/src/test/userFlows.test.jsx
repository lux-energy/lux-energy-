import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CustomerLogin from '../pages/CustomerLogin';
import Contact from '../pages/Contact';
import PasswordRecovery from '../pages/PasswordRecovery';
import { useAuth } from '../context/AuthContext';
import { contactService } from '../services/contactService';
import { passwordRecoveryService } from '../services/passwordRecoveryService';
import { stationService } from '../services/stationService';
import { productService } from '../services/productService';
import { serviceService } from '../services/serviceService';
import { newsService } from '../services/newsService';
import Home from '../pages/Home';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/contactService', () => ({
  contactService: { createMessage: vi.fn() }
}));
vi.mock('../services/passwordRecoveryService', () => ({
  passwordRecoveryService: {
    requestCode: vi.fn(),
    resetPassword: vi.fn()
  }
}));
vi.mock('../services/stationService', () => ({
  stationService: { getAllStations: vi.fn() }
}));
vi.mock('../services/productService', () => ({
  productService: { getAllProducts: vi.fn() }
}));
vi.mock('../services/serviceService', () => ({
  serviceService: { getAllServices: vi.fn() }
}));
vi.mock('../services/newsService', () => ({
  newsService: { getAllNews: vi.fn() }
}));

const authActions = {
  loginCustomer: vi.fn(),
  registerCustomer: vi.fn(),
  verifyCustomerContacts: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: false,
  loading: false
};

const renderWithRoutes = (element, initialEntry, extraRoutes = null) => render(
  <MemoryRouter
    initialEntries={[initialEntry]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Routes>
      <Route path="/login" element={element} />
      <Route path="/forgot-password/:role" element={<PasswordRecovery />} />
      <Route path="/admin/login" element={<ResetResult />} />
      {extraRoutes}
    </Routes>
  </MemoryRouter>
);

const ResetResult = () => {
  const location = useLocation();
  return <p>Password reset complete: {location.state?.passwordResetMessage}</p>;
};

describe('main public and account flows', () => {
  beforeEach(() => {
    useAuth.mockReturnValue(authActions);
    authActions.loginCustomer.mockResolvedValue({ token: 'test-token' });
    authActions.logout.mockReset();
    contactService.createMessage.mockResolvedValue({ id: 1 });
    passwordRecoveryService.requestCode.mockResolvedValue({ message: 'If the account exists, a code was sent.' });
    passwordRecoveryService.resetPassword.mockResolvedValue({ message: 'Password updated.' });
    stationService.getAllStations.mockResolvedValue([]);
    productService.getAllProducts.mockResolvedValue([]);
    serviceService.getAllServices.mockResolvedValue([]);
    newsService.getAllNews.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it('signs a customer in and navigates to the portal', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/portal" element={<h1>Portal reached</h1>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email address'), 'qa.customer@example.invalid');
    await user.type(screen.getByLabelText('Password'), 'synthetic-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('heading', { name: 'Portal reached' })).toBeInTheDocument();
    expect(authActions.loginCustomer).toHaveBeenCalledWith(
      'qa.customer@example.invalid',
      'synthetic-password'
    );
  });

  it('renders the public homepage immediately while a content request is pending', () => {
    stationService.getAllStations.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: "Powering Rwanda's Future" })).toBeInTheDocument();
  });

  it('shows a useful error when customer sign-in fails', async () => {
    const user = userEvent.setup();
    authActions.loginCustomer.mockRejectedValue({
      response: { data: { message: 'Invalid test credentials.' } }
    });
    renderWithRoutes(<CustomerLogin />, '/login');

    await user.type(screen.getByLabelText('Email address'), 'qa.customer@example.invalid');
    await user.type(screen.getByLabelText('Password'), 'wrong-test-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid test credentials.');
  });

  it('validates and submits a contact message with accessible field labels', async () => {
    const user = userEvent.setup();
    render(<Contact />);
    const form = screen.getByRole('button', { name: 'Send Message' }).closest('form');

    expect(form).not.toBeValid();
    for (const field of ['Full Name *', 'Email *', 'Subject *', 'Message *']) {
      expect(screen.getByLabelText(field)).toBeInTheDocument();
    }

    await user.type(screen.getByLabelText('Full Name *'), 'QA Example');
    await user.type(screen.getByLabelText('Email *'), 'qa.sender@example.invalid');
    await user.type(screen.getByLabelText('Subject *'), 'Synthetic staging enquiry');
    await user.type(screen.getByLabelText('Message *'), 'Automated test message; no customer data.');
    await user.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Your message has been sent successfully');
    expect(contactService.createMessage).toHaveBeenCalledWith({
      full_name: 'QA Example',
      email: 'qa.sender@example.invalid',
      phone: '',
      subject: 'Synthetic staging enquiry',
      message: 'Automated test message; no customer data.'
    });
  });

  it('requests a reset code and completes the admin password reset flow', async () => {
    const user = userEvent.setup();
    renderWithRoutes(<PasswordRecovery />, '/forgot-password/admin');

    await user.type(screen.getByLabelText('Account email'), 'qa.admin@example.invalid');
    await user.click(screen.getByRole('button', { name: 'Send reset code' }));
    expect(await screen.findByText('If the account exists, a code was sent.')).toBeInTheDocument();
    expect(passwordRecoveryService.requestCode).toHaveBeenCalledWith({
      email: 'qa.admin@example.invalid',
      role: 'admin',
      channel: 'email',
      phone: undefined
    });

    await user.type(screen.getByLabelText('Six-digit email reset code'), '123456');
    await user.type(screen.getByLabelText('New password'), 'StrongTestPassword1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'StrongTestPassword1!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Password reset complete: Password updated.')).toBeInTheDocument();
    expect(passwordRecoveryService.resetPassword).toHaveBeenCalledWith({
      email: 'qa.admin@example.invalid',
      role: 'admin',
      channel: 'email',
      code: '123456',
      password: 'StrongTestPassword1!',
      confirmPassword: 'StrongTestPassword1!'
    });
    await waitFor(() => expect(authActions.logout).toHaveBeenCalled());
  });
});
