import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordStrength {
	score: number;
	feedback: string;
	color: string;
}

const evaluatePasswordStrength = (password: string): PasswordStrength => {
	let score = 0;
	const feedback = [];

	if (password.length >= 8) score++;
	else feedback.push('At least 8 characters');

	if (/[a-z]/.test(password)) score++;
	else feedback.push('Lowercase letter');

	if (/[A-Z]/.test(password)) score++;
	else feedback.push('Uppercase letter');

	if (/[0-9]/.test(password)) score++;
	else feedback.push('Number');

	if (/[^A-Za-z0-9]/.test(password)) score++;
	else feedback.push('Special character');

	let color = 'bg-red-500';
	if (score >= 4) color = 'bg-green-500';
	else if (score >= 3) color = 'bg-yellow-500';

	return {
		score,
		feedback: feedback.length > 0 ? `Add: ${feedback.join(', ')}` : 'Strong password',
		color,
	};
};

export default function ChangePassword() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	const passwordStrength = evaluatePasswordStrength(formData.newPassword);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		setError('');
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			// Validate inputs
			if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
				setError('All fields are required');
				setLoading(false);
				return;
			}

			if (formData.newPassword.length < 8) {
				setError('Password must be at least 8 characters');
				setLoading(false);
				return;
			}

			if (formData.newPassword !== formData.confirmPassword) {
				setError('Passwords do not match');
				setLoading(false);
				return;
			}

			const response = await fetch('/api/users/change-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					currentPassword: formData.currentPassword,
					newPassword: formData.newPassword,
					confirmPassword: formData.confirmPassword,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Failed to change password');
				setLoading(false);
				return;
			}

			setSuccess(true);
			setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

			// Redirect after 2 seconds
			setTimeout(() => {
				navigate('/dashboard');
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
		setShowPasswords((prev) => ({
			...prev,
			[field]: !prev[field],
		}));
	};

	if (success) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
				<Card className="w-full max-w-md border-green-200 bg-white shadow-lg">
					<CardContent className="pt-8">
						<div className="flex flex-col items-center text-center space-y-4">
							<CheckCircle2 className="w-16 h-16 text-green-600" />
							<h2 className="text-2xl font-bold text-gray-900">Password Changed!</h2>
							<p className="text-gray-600">
								Your password has been successfully changed. Redirecting to dashboard...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader>
					<div className="flex items-center gap-2">
						<Lock className="w-6 h-6 text-blue-600" />
						<div>
							<CardTitle className="text-2xl">Change Password</CardTitle>
							<CardDescription>Required before accessing your dashboard</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-5">
						{/* Current Password */}
						<div className="space-y-2">
							<Label htmlFor="currentPassword" className="font-medium">
								Current Password
							</Label>
							<div className="relative">
								<Input
									id="currentPassword"
									name="currentPassword"
									type={showPasswords.current ? 'text' : 'password'}
									value={formData.currentPassword}
									onChange={handleChange}
									placeholder="Enter your current password"
									className="pr-10"
									disabled={loading}
								/>
								<button
									type="button"
									onClick={() => togglePasswordVisibility('current')}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
									tabIndex={-1}
								>
									{showPasswords.current ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
						</div>

						{/* New Password */}
						<div className="space-y-2">
							<Label htmlFor="newPassword" className="font-medium">
								New Password
							</Label>
							<div className="relative">
								<Input
									id="newPassword"
									name="newPassword"
									type={showPasswords.new ? 'text' : 'password'}
									value={formData.newPassword}
									onChange={handleChange}
									placeholder="Enter new password"
									className="pr-10"
									disabled={loading}
								/>
								<button
									type="button"
									onClick={() => togglePasswordVisibility('new')}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
									tabIndex={-1}
								>
									{showPasswords.new ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>

							{/* Password Strength */}
							{formData.newPassword && (
								<div className="space-y-2">
									<div className="flex gap-1">
										{Array(5)
											.fill(0)
											.map((_, i) => (
												<div
													key={i}
													className={`flex-1 h-2 rounded-full ${
														i < passwordStrength.score
															? passwordStrength.color
															: 'bg-gray-200'
													}`}
												/>
											))}
									</div>
									<p className="text-xs text-gray-600">{passwordStrength.feedback}</p>
								</div>
							)}
						</div>

						{/* Confirm Password */}
						<div className="space-y-2">
							<Label htmlFor="confirmPassword" className="font-medium">
								Confirm Password
							</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type={showPasswords.confirm ? 'text' : 'password'}
									value={formData.confirmPassword}
									onChange={handleChange}
									placeholder="Confirm new password"
									className="pr-10"
									disabled={loading}
								/>
								<button
									type="button"
									onClick={() => togglePasswordVisibility('confirm')}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
									tabIndex={-1}
								>
									{showPasswords.confirm ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
						</div>

						{/* Error Message */}
						{error && (
							<div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
								<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
								<p className="text-sm text-red-700">{error}</p>
							</div>
						)}

						{/* Submit Button */}
						<Button
							type="submit"
							disabled={loading}
							className="w-full bg-blue-600 hover:bg-blue-700"
						>
							{loading ? 'Changing Password...' : 'Change Password'}
						</Button>

						{/* Password Requirements */}
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
							<p className="text-sm font-medium text-blue-900">Password Requirements:</p>
							<ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
								<li>At least 8 characters</li>
								<li>Mix of uppercase and lowercase letters</li>
								<li>At least one number</li>
								<li>Special character recommended</li>
							</ul>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
