import React, { useState, useEffect } from 'react';

const BoundariesForm = ({ boundary, location, years, areaName, onReset, onSubmitted }) => {
  const [changes, setChanges] = useState('');
  const [animate, setAnimate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const submission = {
      areaName,
      years,
      changes,
      location,
      boundary,
    };

    try {
      const res = await fetch('https://neighborhoods-lgvg.onrender.com/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (res.ok) {
        console.log('✅ Submission saved:', submission);
        onSubmitted();
      } else {
        setError