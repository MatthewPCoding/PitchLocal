import FreelancerProfile from "../components/profile/FreelancerProfile";

export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your info to personalise AI pitch generation.
        </p>
      </div>
      <FreelancerProfile />
    </div>
  );
}
