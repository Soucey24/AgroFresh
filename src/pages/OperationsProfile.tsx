import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Upload, Loader2, FileText, User } from 'lucide-react';
import { getProfile } from '@/api';

interface VerificationStatus {
	status: 'pending' | 'approved' | 'rejected';
	verification_notes?: string;
	verified_at?: string;
}

interface UserProfile {
	id: string;
	name: string;
	email: string;
	phone: string;
	role: string;
	location: string;
	verification_status: string;
	ghana_card_photo?: boolean;
	face_photo?: boolean;
}

export default function OperationsProfile() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const [ghanaCardFile, setGhanaCardFile] = useState<File | null>(null);
	const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);

	const [ghanaCardPreview, setGhanaCardPreview] = useState<string>('');
	const [facePhotoPreview, setFacePhotoPreview] = useState<string>('');

	useEffect(() => {
		const loadProfile = async () => {
			try {
				const data = await getProfile();
				if (data?.error) {
					setError(data.error);
					navigate('/login');
					return;
				}
				setProfile(data);
			} catch (err) {
				setError('Failed to load profile');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		loadProfile();
	}, [navigate]);

	const handleFileChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		type: 'ghana_card' | 'face_photo'
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			setError('File size must be less than 5MB');
			return;
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			setError('Please select an image file');
			return;
		}

		if (type === 'ghana_card') {
			setGhanaCardFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setGhanaCardPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		} else {
			setFacePhotoFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setFacePhotoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}

		setError('');
	};

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault();
		setUploading(true);
		setError('');
		setSuccess('');

		try {
			if (!ghanaCardFile || !facePhotoFile) {
				setError('Please select both Ghana card and face photo');
				setUploading(false);
				return;
			}

			// Convert files to base64
			const ghanaCardBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(ghanaCardFile);
			});

			const facePhotoBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(facePhotoFile);
			});

			// Upload to server
			const response = await fetch('/api/users/verify-photos', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					ghana_card_photo: ghanaCardBase64,
					face_photo: facePhotoBase64,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Failed to upload photos');
				setUploading(false);
				return;
			}

			setSuccess(
				data.verification_status === 'approved'
					? 'Photos verified successfully! You are now approved.'
					: 'Photos uploaded. Verification pending manual review.'
			);

			// Update profile
			setProfile((prev) => ({
				...prev!,
				verification_status: data.verification_status,
				ghana_card_photo: true,
				face_photo: true,
			}));

			// Reset form
			setGhanaCardFile(null);
			setFacePhotoFile(null);
			setGhanaCardPreview('');
			setFacePhotoPreview('');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setUploading(false);
		}
	};

	const getStatusColor = (status: string) => {
		if (status === 'approved') return 'bg-green-50 border-green-200';
		if (status === 'rejected') return 'bg-red-50 border-red-200';
		return 'bg-yellow-50 border-yellow-200';
	};

	const getStatusBadgeColor = (status: string) => {
		if (status === 'approved')
			return 'bg-green-100 text-green-800';
		if (status === 'rejected')
			return 'bg-red-100 text-red-800';
		return 'bg-yellow-100 text-yellow-800';
	};

	const getStatusIcon = (status: string) => {
		if (status === 'approved') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
		if (status === 'rejected') return <AlertCircle className="w-5 h-5 text-red-600" />;
		return <Upload className="w-5 h-5 text-yellow-600" />;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
				<Card className="w-full max-w-md border-red-200">
					<CardContent className="pt-8">
						<div className="flex gap-3">
							<AlertCircle className="w-5 h-5 text-red-600" />
							<div>
								<p className="text-red-800">Failed to load profile</p>
								<Button className="mt-4" onClick={() => navigate('/login')}>
									Go to Login
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const isOperations = profile.role === 'operations';
	const isVerificationComplete = profile.verification_status === 'approved';

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
			<div className="max-w-2xl mx-auto space-y-6">
				{/* Profile Card */}
				<Card>
					<CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
						<div className="flex items-center gap-2">
							<User className="w-6 h-6" />
							<div>
								<CardTitle>My Profile</CardTitle>
								<CardDescription className="text-blue-100">
									Manage your account information
								</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent className="pt-6 space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label className="text-xs font-semibold text-gray-500 uppercase">Name</Label>
								<p className="text-lg font-medium mt-1">{profile.name}</p>
							</div>
							<div>
								<Label className="text-xs font-semibold text-gray-500 uppercase">Email</Label>
								<p className="text-lg font-medium mt-1">{profile.email}</p>
							</div>
							<div>
								<Label className="text-xs font-semibold text-gray-500 uppercase">Phone</Label>
								<p className="text-lg font-medium mt-1">{profile.phone || 'Not provided'}</p>
							</div>
							<div>
								<Label className="text-xs font-semibold text-gray-500 uppercase">Role</Label>
								<p className="text-lg font-medium mt-1 capitalize">{profile.role}</p>
							</div>
							<div className="col-span-2">
								<Label className="text-xs font-semibold text-gray-500 uppercase">Location</Label>
								<p className="text-lg font-medium mt-1">{profile.location || 'Not specified'}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Verification Status Card */}
				{isOperations && (
					<Card className={getStatusColor(profile.verification_status)}>
						<CardHeader className="flex flex-row items-center justify-between">
							<div className="flex items-center gap-2">
								{getStatusIcon(profile.verification_status)}
								<div>
									<CardTitle>Verification Status</CardTitle>
								</div>
							</div>
							<span
								className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(
									profile.verification_status
								)}`}
							>
								{profile.verification_status.charAt(0).toUpperCase() +
									profile.verification_status.slice(1)}
							</span>
						</CardHeader>

						{profile.verification_status === 'pending' && (
							<CardContent className="space-y-4">
								<p className="text-sm text-gray-700">
									Please upload your Ghana card and face photo to complete verification.
								</p>
							</CardContent>
						)}

						{profile.verification_status === 'approved' && (
							<CardContent>
								<div className="flex gap-2 text-green-800">
									<CheckCircle2 className="w-5 h-5 flex-shrink-0" />
									<p>Your account has been verified. You have full access to the platform.</p>
								</div>
							</CardContent>
						)}

						{profile.verification_status === 'rejected' && (
							<CardContent className="space-y-2">
								<p className="text-red-800 font-semibold">Verification was rejected</p>
								{profile.verification_notes && (
									<p className="text-sm text-red-700">Reason: {profile.verification_notes}</p>
								)}
							</CardContent>
						)}
					</Card>
				)}

				{/* Document Upload Card */}
				{isOperations && profile.verification_status !== 'approved' && (
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<FileText className="w-6 h-6 text-blue-600" />
								<div>
									<CardTitle>Upload Documents</CardTitle>
									<CardDescription>
										Upload your Ghana card and a clear face photo for verification
									</CardDescription>
								</div>
							</div>
						</CardHeader>

						<CardContent>
							<form onSubmit={handleUpload} className="space-y-6">
								{/* Ghana Card Upload */}
								<div className="space-y-3">
									<Label className="font-semibold">Ghana Card Photo *</Label>
									<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
										<input
											type="file"
											accept="image/*"
											onChange={(e) => handleFileChange(e, 'ghana_card')}
											className="hidden"
											id="ghana-card-input"
										/>
										<label htmlFor="ghana-card-input" className="cursor-pointer">
											{ghanaCardPreview ? (
												<img
													src={ghanaCardPreview}
													alt="Ghana Card Preview"
													className="w-full h-48 object-cover rounded"
												/>
											) : (
												<div className="py-8">
													<Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
													<p className="text-gray-600 font-medium">
														Click to upload Ghana card
													</p>
													<p className="text-xs text-gray-500 mt-1">
														PNG, JPG up to 5MB
													</p>
												</div>
											)}
										</label>
									</div>
									{ghanaCardFile && (
										<p className="text-sm text-green-700">
											✓ Ghana card selected: {ghanaCardFile.name}
										</p>
									)}
								</div>

								{/* Face Photo Upload */}
								<div className="space-y-3">
									<Label className="font-semibold">Face Photo *</Label>
									<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
										<input
											type="file"
											accept="image/*"
											onChange={(e) => handleFileChange(e, 'face_photo')}
											className="hidden"
											id="face-photo-input"
										/>
										<label htmlFor="face-photo-input" className="cursor-pointer">
											{facePhotoPreview ? (
												<img
													src={facePhotoPreview}
													alt="Face Photo Preview"
													className="w-full h-48 object-cover rounded"
												/>
											) : (
												<div className="py-8">
													<Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
													<p className="text-gray-600 font-medium">
														Click to upload face photo
													</p>
													<p className="text-xs text-gray-500 mt-1">
														PNG, JPG up to 5MB
													</p>
												</div>
											)}
										</label>
									</div>
									{facePhotoFile && (
										<p className="text-sm text-green-700">
											✓ Face photo selected: {facePhotoFile.name}
										</p>
									)}
								</div>

								{/* Error Message */}
								{error && (
									<div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
										<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
										<p className="text-sm text-red-700">{error}</p>
									</div>
								)}

								{/* Success Message */}
								{success && (
									<div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
										<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
										<p className="text-sm text-green-700">{success}</p>
									</div>
								)}

								{/* Submit Button */}
								<Button
									type="submit"
									disabled={uploading || !ghanaCardFile || !facePhotoFile}
									className="w-full bg-blue-600 hover:bg-blue-700"
								>
									{uploading ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Uploading & Verifying...
										</>
									) : (
										<>
											<Upload className="w-4 h-4 mr-2" />
											Upload Documents
										</>
									)}
								</Button>

								{/* Requirements */}
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
									<p className="text-sm font-semibold text-blue-900">Requirements:</p>
									<ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
										<li>Clear, well-lit photos</li>
										<li>Face photo with clear visibility of your face</li>
										<li>Ghana card with all details visible</li>
										<li>Photos must match (same person)</li>
									</ul>
								</div>
							</form>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
