import { Link } from 'react-router-dom'

const Privacy = () => (
  <div className="container mx-auto px-4 py-12 max-w-3xl">
    <h1 className="text-3xl font-bold text-[var(--color-text)] text-white mb-6">Privacy</h1>
    <div className="prose prose-invert text-[var(--color-text)] text-[var(--color-textSecondary)] space-y-4">
      <p>
        We collect the information you provide at registration and data needed to run church programmes (for example
        announcements, departments, and payments). Access is limited by role.
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Contact the church office to request corrections to your profile data.</li>
        <li>Do not post others&apos; personal data in announcements without consent.</li>
      </ul>
      <p className="text-sm text-[var(--color-textSecondary)]">Replace with a full privacy policy approved by church leadership.</p>
    </div>
    <Link to="/auth/register" className="inline-block mt-8 text-primary-600 hover:underline">
      ← Back to registration
    </Link>
  </div>
)

export default Privacy
