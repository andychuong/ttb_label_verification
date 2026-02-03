import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Submit",
    description:
      "Fill in your product details and upload a photo of your bottle label.",
  },
  {
    number: "2",
    title: "AI Validates",
    description:
      "GPT-4o extracts all visible text from the label and compares it field-by-field against your form data.",
  },
  {
    number: "3",
    title: "Get Results",
    description:
      "Receive an instant pass/fail report with detailed analysis for every checked field.",
  },
];

const features = [
  {
    title: "Automated Verification",
    description:
      "GPT-4o vision compares your label image against submitted form data — brand name, alcohol content, net contents, and more.",
  },
  {
    title: "Instant Results",
    description:
      "Real-time status updates via Firestore. See your submission move from Pending to Approved without refreshing.",
  },
  {
    title: "Admin Review",
    description:
      "Flagged submissions are routed to an admin queue for human review, with full AI reports and one-click actions.",
  },
  {
    title: "Compliance Checks",
    description:
      "Verifies health warning presence, name and address, country of origin for imports, and TTB standards of fill.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-lg font-bold text-gray-900">
            TTB Label Verification
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="bg-gray-50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              AI-Powered Alcohol Label Verification
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Submit your product information and label image. Our system uses
              GPT-4o to verify that your label matches your form data and meets
              federal labeling requirements — in seconds, not weeks.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
              Three simple steps from submission to verification.
            </p>
            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              Built for Compliance
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
              Everything you need to verify alcohol labels against TTB
              requirements.
            </p>
            <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-gray-200 bg-white p-6"
                >
                  <h3 className="text-base font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-400">
          TTB Label Verification &mdash; AI-Powered Alcohol Label Compliance
        </p>
      </footer>
    </div>
  );
}
