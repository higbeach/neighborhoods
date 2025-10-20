import React, { useState, useEffect, useRef } from 'react';
import './NeighborhoodSurvey.css';
import { supabase } from './supabaseClient';
import { page1Questions, page2Questions } from './surveyQuestions';

const NeighborhoodSurvey = ({ location, years, areaName, boundary, submissionUuid, onComplete }) => {
  const [page, setPage] = useState(1);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef();
  const scrollAnchorRef = useRef();

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({ behavior: 'instant' });
      }
    });
  }, [page]);

  const handleChange = (key, value) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!submissionUuid) {
      alert('Missing submission ID. Cannot update survey.');
      console.error('🚨 No submissionId provided to NeighborhoodSurvey.');
      return;
    }

    const updatePayload = {
      survey: responses,
      comments: responses.additionalComments || '',
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('submissions')
      .update({ properties: updatePayload })
      .eq('uuid', submissionUuid);

    if (error) {
      console.error('❌ Supabase update error:', error.message);
      alert('There was a problem saving your survey. Please try again.');
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

  const renderRadioButtons = (q, value) => {
    const binaryKeys = ['attendReligious', 'housingStatus', 'grewUpHere'];
    const isBinary =
      binaryKeys.includes(q.key) ||
      (q.options.length === 2 &&
        q.options.every((opt) =>
          ['yes', 'no', 'rent', 'own'].includes(opt.toLowerCase())
        ));

    return isBinary ? (
      <div className="likert-scale">
        {q.options.map((opt) => (
          <button
            key={opt}
            className={value === opt ? 'selected' : ''}
            onClick={() => handleChange(q.key, opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    ) : (
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
    );
  };

  const renderDropdown = (q, value) => (
    <div className="custom-select">
      <select
        value={value}
        onChange={(e) => handleChange(q.key, e.target.value)}
      >
        <option value="">Select</option>
        {q.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="select-arrow">▾</span>
    </div>
  );

  return (
    <div className="survey-modal" ref={modalRef}>
      <div ref={scrollAnchorRef} style={{ height: 0, overflow: 'hidden' }}></div>

      {page === 1 && (
        <>
          <h2>Survey: Your Neighborhood Experience</h2>
          <p>
            Below are 20 questions about your neighborhood experience and feelings. The second page has 8 questions about your background. All information will be kept confidential.
          </p>
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
                    {(q.options || [
                      { label: 'Strongly Disagree', value: 1 },
                      { label: 'Disagree', value: 2 },
                      { label: 'Neither Agree nor Disagree', value: 3 },
                      { label: 'Agree', value: 4 },
                      { label: 'Strongly Agree', value: 5 },
                    ]).map(({ label, value: num }) => (
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

                {q.type === 'radio' && Array.isArray(q.options) && renderRadioButtons(q, value)}

                {q.type === 'rank' && (
                  <div className="rank-scale">
                    <span className="rank-label left">{q.leftLabel}</span>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        className={responses[q.key] === num ? 'selected' : ''}
                        onClick={() => handleChange(q.key, num)}
                      >
                        {num}
                      </button>
                    ))}
                    <span className="rank-label right">{q.rightLabel}</span>
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
          <h2>Please tell us a little more about you</h2>
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

                {q.type === 'dropdown' && Array.isArray(q.options) && renderDropdown(q, value)}

                {q.type === 'radio' && Array.isArray(q.options) && renderRadioButtons(q, value)}
              </div>
            );
          })}

          <div className="survey-actions">
            <button className="secondary" onClick={() => setPage(1)}>Back</button>
            <button onClick={() => setPage(3)}>Next</button>
          </div>
        </>
      )}

      {page === 3 && (
        <>
          <h2>Additional Comments</h2>
          <div className="survey-question">
            <label>
              Do you have any additional comments you would like to share about your feelings or experience living in your neighborhood?
            </label>
            <textarea
              value={responses.additionalComments || ''}
              onChange={(e) => handleChange('additionalComments', e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '8px', fontSize: '1rem' }}
            />
          </div>

          <div className="survey-actions">
            <button className="secondary" onClick={() => setPage(2)}>Back</button>
            <button onClick={handleSubmit}>Submit</button>
          </div>
        </>
      )}
    </div>
  );
};

export default NeighborhoodSurvey;