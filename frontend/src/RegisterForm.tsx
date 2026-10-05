import React, { useState } from "react";
import { registerUser } from "./api";
import { showNotification } from './AppNotificationModal';

type User = {
  id: number;
  _id?: string;
  name: string;
  email: string;
  type: string;
  subscribed: boolean;
  campus: string;
};

interface RegisterFormProps {
  onRegisterSuccess: (user: User, token?: string) => void;
  onShowLogin: () => void;
  onClose: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegisterSuccess,
  onShowLogin,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [campus, setCampus] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");

  const campuses = [
    { id: "pretoria-main", name: "Pretoria Central" },
    { id: "soshanguve-S", name: "Soshanguve South" },
    { id: "soshanguve-N", name: "Soshanguve North" },
    { id: "ga-rankuwa", name: "Ga-Rankuwa" },
    { id: "pretoria-west", name: "Pretoria Arcadia" },
    { id: "arts", name: "Arts" },
    { id: "emalahleni", name: "eMalahleni" },
    { id: "mbombela", name: "Mbombela" },
    { id: "polokwane", name: "Polokwane" },
  ];

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !campus) {
      showNotification({ type: 'warning', title: 'Complete your details', message: 'Please fill in all required fields before continuing.' });
      return;
    }

    if (password.length < 8) {
      showNotification({ type: 'warning', title: 'Password is too short', message: 'Your password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      showNotification({ type: 'warning', title: 'Passwords do not match', message: 'Enter the same password in both password fields.' });
      return;
    }

    try {
      const response = await registerUser({
        name,
        email,
        password,
        campus,
        whatsapp,
        type: accountType,
      });

      // Pass both user AND token to parent component
      onRegisterSuccess(response.user, response.token);

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCampus("");
      setWhatsapp("");

      showNotification({
        type: 'success',
        title: `Welcome to FYC Marketplace, ${response.user.name}`,
        message: accountType === 'seller'
          ? 'Your seller profile is ready. Subscribe for R25/month, or claim an eligible offer when one appears.'
          : 'Your buyer account is ready. You can start exploring the marketplace.',
        actionLabel: 'Get started'
      });
    } catch (error) {
      let errorMessage = "Registration failed. Please try again.";
      if (error && typeof error === "object" && "message" in error) {
        errorMessage = (error as { message: string }).message;
      }
      showNotification({ type: 'error', title: 'Registration failed', message: errorMessage, actionLabel: 'Try again' });
    }
  };

  const handleSwitchToLogin = () => {
    onClose();
    onShowLogin();
  };

  return (
    <div className="apple-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="apple-modal-card bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Register for FYC Marketplace
        </h2>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-3 border rounded mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <input
          type="email"
          placeholder="Email Address"
          className="w-full p-3 border rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password (min 8 characters)"
          className="w-full p-3 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className={`w-full p-3 border rounded mb-4 ${
            confirmPassword
              ? password !== confirmPassword
                ? "border-red-500"
                : "border-blue-500"
              : ""
          }`}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={accountType === "buyer"}
                onChange={() => setAccountType("buyer")}
              />
              Buyer
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={accountType === "seller"}
                onChange={() => setAccountType("seller")}
              />
              Seller
            </label>
          </div>
          {accountType === "seller" && (
            <p className="text-xs text-gray-600 mt-2">
              Seller status requires an active R25/month subscription. Any free period or discount appears as a separate offer and starts only when you claim it. No admin approval is required.
            </p>
          )}
        </div>

        <select
          className="w-full p-3 border rounded mb-4"
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
        >
          <option value="">Select Your Location</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="tel"
          placeholder="WhatsApp (+27...)"
          className="w-full p-3 border rounded mb-4"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={handleRegister}
            className="flex-1 bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
          >
            Register
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 p-3 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <button
            className="text-blue-600 hover:underline"
            onClick={handleSwitchToLogin}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
