import React, { useEffect, useState } from 'react';
import { FaBriefcase, FaMapMarkerAlt, FaClock, FaBuilding } from 'react-icons/fa';
import { careerService } from '../services/careerService';
import LoadingSpinner from '../components/LoadingSpinner';

const Careers = () => {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const data = await careerService.getAllCareers();
        setCareers(data);
      } catch (error) {
        console.error('Error fetching careers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCareers();
  }, []);

  const formatDate = (dateString) => {
    /** @type {Intl.DateTimeFormatOptions} */
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-energy-600 to-energy-800 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-gray-100">Build your career with Lux Energy Rwanda</p>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Work With Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-energy-600 text-4xl mb-4">
                <FaBuilding />
              </div>
              <h3 className="text-xl font-semibold mb-3">Growth Opportunities</h3>
              <p className="text-gray-600">
                We believe in nurturing talent and providing opportunities for professional growth and advancement.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-energy-600 text-4xl mb-4">
                <FaBriefcase />
              </div>
              <h3 className="text-xl font-semibold mb-3">Competitive Benefits</h3>
              <p className="text-gray-600">
                We offer competitive salaries, comprehensive benefits, and a supportive work environment.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-energy-600 text-4xl mb-4">
                <FaMapMarkerAlt />
              </div>
              <h3 className="text-xl font-semibold mb-3">Impactful Work</h3>
              <p className="text-gray-600">
                Join a team that&apos;s making a real difference in Rwanda&apos;s energy sector and economic development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Open Positions</h2>
          
          {careers.length === 0 ? (
            <div className="text-center py-12">
              <FaBriefcase className="text-gray-400 text-5xl mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No open positions at the moment. Please check back later.</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {careers.map((career) => (
                <div key={career.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-xl font-semibold text-energy-600">{career.title}</h3>
                    <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full mt-2 md:mt-0">
                      Open
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FaBuilding className="text-energy-600 mr-2" />
                      <span>{career.department}</span>
                    </div>
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-energy-600 mr-2" />
                      <span>{career.location}</span>
                    </div>
                    <div className="flex items-center">
                      <FaClock className="text-energy-600 mr-2" />
                      <span>{career.employment_type}</span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">{career.description}</p>

                  {career.deadline && (
                    <div className="text-sm text-gray-500 mb-4">
                      <strong>Application Deadline:</strong> {formatDate(career.deadline)}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button className="flex-1 bg-energy-600 text-white px-4 py-2 rounded-lg hover:bg-energy-700 transition-colors">
                      Apply Now
                    </button>
                    <button className="flex-1 border border-energy-600 text-energy-600 px-4 py-2 rounded-lg hover:bg-energy-50 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Application Process */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Application Process</h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-energy-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Submit Application</h3>
                  <p className="text-gray-600">
                    Send your CV and cover letter to careers@luxenergy.rw or apply in person at our headquarters.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-energy-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Initial Screening</h3>
                  <p className="text-gray-600">
                    Our HR team reviews applications and selects candidates for interviews.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-energy-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Interviews</h3>
                  <p className="text-gray-600">
                    Shortlisted candidates are invited for interviews with the hiring team.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-energy-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Offer & Onboarding</h3>
                  <p className="text-gray-600">
                    Successful candidates receive offers and go through our comprehensive onboarding process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Questions About Careers?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            If you have any questions about working at Lux Energy or our application process, please contact our HR team.
          </p>
          <a href="mailto:careers@luxenergy.rw" className="btn-primary inline-block">
            Contact HR
          </a>
        </div>
      </section>
    </div>
  );
};

export default Careers;