import React, { useState, useEffect } from 'react';
import './NeighborhoodSurvey.css';
import { supabase } from './supabaseClient';
import { page1Questions, page2Questions } from './surveyQuestions';

const NeighborhoodSurvey = ({ location, years, areaName, boundary, onComplete }) => {
  console.log('📋 Survey component mounted');

  const [page, setPage] = useState(1);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);

  console.log('📦 page1Questions:', page1Questions);

  // ✅ Debug logging on page or response change
  useEffect(() => {
    console.log('✅ NeighborhoodSurvey active');
    console.log('🧭 Current page:', page);
    console.log('🧾 Responses:', responses);
  }, [page, responses]);

  const handleChange = (key, value) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const feature = {
      type: 'Feature',
      geometry: boundary,
      properties: {
        id: crypto.randomUUID(),
        location: areaName,
        years: parseInt(years),
        timestamp: new Date().toISOString(),
        neighborhood: areaName,
        survey: responses,
      },
    };

    const { error } = await supabase.from('submissions').insert([
      {
        geometry: feature.geometry,
        properties: feature.properties,
      },
    ]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      alert('There was a problem saving your submission. Please try again.');
      return;
    }

    setSubmitted(true);
    onComplete();
  };

  if (submitted) {
    return (
      <div className="survey-modal">
        <h2>Thank you!</h2>
        <p>Your survey responses have been recorded.</p>
      </div>
    );
  }

  return (
    <div className="survey-modal">
      {page === 1 && (
        <>
          <h2>Neighborhood Experience</h2>
          {page1Questions.map((q) => {
            const value = responses[q.key] || '';
            return (
              <div key={q.key} className="survey-question">
                <label>{q.label}</label>

                {q.type === 'slider' && (
                  <>
                    <input
                      type="range"
                      min={q.min}
                      max={q.max}
                      value={value}
                      onChange={(e) => handleChange(q.key, parseInt(e.target.value))}
                    />
                    <p>{value}</p>
                  </>
                )}

                {q.type === 'likert' && (
                 <div className="likert-scale">
                  {[
                    { label: 'Strongly Disagree', value: 1 },
                    { label: 'Disagree', value: 2 },
                    { label: 'Neither Agree nor Disagree', value: 3 },
                    { label: 'Agree', value: 4 },
                    { label: 'Strongly Agree', value: 5 },
                    ].map(({ label, value: num }) => (
                    <button
                        key={label}
                        className={responses[q.key] === num ? 'selected' : ''}
                        onClick={() => handleChange(q.key, num)}
                    >
                        {label}
                    </button>
                    ))}
                </div>
                )}

                {q.type === 'radio' && (
                  <div className="radio-group">
                    {q.options.map((opt) => (
                      <label key={opt}>
                        <input
                          type="radio"
                          name={q.key}
                          value={opt}
                          checked={value === opt}
                          onChange={(e) => handleChange(q.key, e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'rank' && (
                  <div className="rank-scale">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        className={value === num ? 'selected' : ''}
                        onClick={() => handleChange(q.key, num)}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="survey-actions">
            <button onClick={() => setPage(2)}>Next</button>
          </div>
        </>
      )}

      {page === 2 && (
        <>
          <h2>Neighborhood Background</h2>
          {page2Questions.map((q) => {
            const value = responses[q.key] || '';
            return (
              <div key={q.key} className="survey-question">
                <label>{q.label}</label>

                {q.type === 'slider' && (
                  <>
                    <input
                      type="range"
                      min={q.min}
                      max={q.max}
                      value={value}
                      onChange={(e) => handleChange(q.key, parseInt(e.target.value))}
                    />
                    <p>{value}</p>
                  </>
                )}

                {q.type === 'dropdown' && (
                  <select
                    value={value}
                    onChange={(e) => handleChange(q.key, e.target.value)}
                  >
                    <option value="">Select</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.type === 'radio' && (
                  <div className="radio-group">
                    {q.options.map((opt) => (
                      <label key={opt}>
                        <input
                          type="radio"
                          name={q.key}
                          value={opt}
                          checked={value === opt}
                          onChange={(e) => handleChange(q.key, e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="survey-actions">
            <button className="secondary" onClick={() => setPage(1)}>Back</button>
            <button onClick={handleSubmit}>Submit</button>
        </div>
        </>
      )}
    </div>
  );
};

export default NeighborhoodSurvey;