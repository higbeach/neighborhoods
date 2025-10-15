import React, { useState } from 'react';
import './NeighborhoodSurvey.css';
import { supabase } from './supabaseClient'; // Make sure this path matches your project

const NeighborhoodSurvey = ({ location, years, areaName, boundary, onComplete }) => {
  const [page, setPage] = useState(1);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);

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
        survey: responses
      }
    };

    const { error } = await supabase.from('submissions').insert([
      {
        geometry: feature.geometry,
        properties: feature.properties
      }
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

          <label>How many neighbors do you know personally, at least as acquaintances?</label>
          <input
            type="range"
            min="0"
            max="200"
            value={responses.knownNeighbors || 0}
            onChange={(e) => handleChange('knownNeighbors', e.target.value)}
          />
          <p>{responses.knownNeighbors || 0}</p>

          <label>Of those, how many would you consider to be friends?</label>
          <input
            type="range"
            min="0"
            max="200"
            value={responses.friendNeighbors || 0}
            onChange={(e) => handleChange('friendNeighbors', e.target.value)}
          />
          <p>{responses.friendNeighbors || 0}</p>

          <label>I regularly stop and talk with people in my neighborhood.</label>
          <select
            value={responses.talkRegularly || ''}
            onChange={(e) => handleChange('talkRegularly', parseInt(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">1 - Strongly Disagree</option>
            <option value="2">2 - Disagree</option>
            <option value="3">3 - Neither Agree nor Disagree</option>
            <option value="4">4 - Agree</option>
            <option value="5">5 - Strongly Agree</option>
          </select>

          <label>I take part in some social or civic groups in my neighborhood.</label>
          <select
            value={responses.civicGroups || ''}
            onChange={(e) => handleChange('civicGroups', parseInt(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">1 - Strongly Disagree</option>
            <option value="2">2 - Disagree</option>
            <option value="3">3 - Neither Agree nor Disagree</option>
            <option value="4">4 - Agree</option>
            <option value="5">5 - Strongly Agree</option>
          </select>

          <label>I attend religious services in my neighborhood.</label>
          <select
            value={responses.attendReligious || ''}
            onChange={(e) => handleChange('attendReligious', e.target.value)}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <label>I wish I had more contact with people in my neighborhood.</label>
          <select
            value={responses.wishMoreContact || ''}
            onChange={(e) => handleChange('wishMoreContact', parseInt(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">1 - Strongly Disagree</option>
            <option value="2">2 - Disagree</option>
            <option value="3">3 - Neither Agree nor Disagree</option>
            <option value="4">4 - Agree</option>
            <option value="5">5 - Strongly Agree</option>
          </select>

          <label>Living in this neighborhood gives me a sense of community.</label>
          <select
            value={responses.senseOfCommunity || ''}
            onChange={(e) => handleChange('senseOfCommunity', parseInt(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">1 - Strongly Disagree</option>
            <option value="2">2 - Disagree</option>
            <option value="3">3 - Neither Agree nor Disagree</option>
            <option value="4">4 - Agree</option>
            <option value="5">5 - Strongly Agree</option>
          </select>

          <label>I feel like I belong in my neighborhood.</label>
          <select
            value={responses.belonging || ''}
            onChange={(e) => handleChange('belonging', parseInt(e.target.value))}
          >
            <option value="">Select</option>
            <option value="1">1 - Strongly Disagree</option>
            <option value="2">2 - Disagree</option>
            <option value="3">3 - Neither Agree nor Disagree</option>
            <option value="4">4 - Agree</option>
            <option value="5">5 - Strongly Agree</option>
          </select>

          <div className="survey-actions">
            <button onClick={() => setPage(2)}>Next</button>
          </div>
        </>
      )}
            {page === 2 && (
        <>
          <h2>Neighborhood Background</h2>

          <label>What race or ethnicity best describes you?</label>
          <select
            value={responses.raceEthnicity || ''}
            onChange={(e) => handleChange('raceEthnicity', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Black or African American">Black or African American</option>
            <option value="White">White</option>
            <option value="Latino or Hispanic">Latino or Hispanic</option>
            <option value="Asian or Pacific Islander">Asian or Pacific Islander</option>
            <option value="Native American or Alaska Native">Native American or Alaska Native</option>
            <option value="Middle Eastern or North African">Middle Eastern or North African</option>
            <option value="Multiracial">Multiracial</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>

          <label>What is your age?</label>
          <select
            value={responses.age || ''}
            onChange={(e) => handleChange('age', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Under 18">Under 18</option>
            <option value="18–24">18–24</option>
            <option value="25–34">25–34</option>
            <option value="35–44">35–44</option>
            <option value="45–54">45–54</option>
            <option value="55–64">55–64</option>
            <option value="65 or older">65 or older</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>

          <label>Are you currently married and living with your spouse?</label>
          <select
            value={responses.married || ''}
            onChange={(e) => handleChange('married', e.target.value)}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <label>Including yourself, how many people live in your household?</label>
          <input
            type="range"
            min="1"
            max="20"
            value={responses.householdSize || 1}
            onChange={(e) => handleChange('householdSize', e.target.value)}
          />
          <p>{responses.householdSize || 1}</p>

          <label>How many children under 18 live in your household?</label>
          <input
            type="range"
            min="0"
            max="20"
            value={responses.childrenUnder18 || 0}
            onChange={(e) => handleChange('childrenUnder18', e.target.value)}
          />
          <p>{responses.childrenUnder18 || 0}</p>

          <label>Approximate household income:</label>
          <select
            value={responses.income || ''}
            onChange={(e) => handleChange('income', e.target.value)}
          >
            <option value="">Select</option>
            <option value="Under $25,000">Under $25,000</option>
            <option value="$25,000–$49,999">$25,000–$49,999</option>
            <option value="$50,000–$74,999">$50,000–$74,999</option>
            <option value="$75,000–$99,999">$75,000–$99,999</option>
            <option value="$100,000–$149,999">$100,000–$149,999</option>
            <option value="$150,000 or more">$150,000 or more</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>

          <label>Do you or your family rent or own your home?</label>
          <select
            value={responses.housing || ''}
            onChange={(e) => handleChange('housing', e.target.value)}
          >
            <option value="">Select</option>
            <option value="rent">Rent</option>
            <option value="own">Own</option>
            <option value="other">Other</option>
            <option value="prefer not to say">Prefer not to say</option>
          </select>

          <label>Did you grow up in this neighborhood?</label>
          <select
            value={responses.grewUpHere || ''}
            onChange={(e) => handleChange('grewUpHere', e.target.value)}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <div className="survey-actions">
            <button onClick={handleSubmit}>Submit</button>
          </div>
        </>
      )}
    </div>
  );
};

export default NeighborhoodSurvey;