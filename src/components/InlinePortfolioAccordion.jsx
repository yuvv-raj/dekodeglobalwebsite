import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import foodManufacturingImage from '../assets/case-study-food-manufacturing.jpg';
import primarySchoolImage from '../assets/case-study-primary-school.jpg';
import attendMeImage from '../assets/portfolio/attendme.jpg';
import chauffrImage from '../assets/portfolio/chauffr.jpg';
import smartLoanImage from '../assets/portfolio/smart-loan.jpg';
import smartBrokerImage from '../assets/portfolio/smartbroker.png';
import recycledMarketImage from '../assets/portfolio/recycled-market.png';
import estradoImage from '../assets/portfolio/estrado.jpg';

const images = {
  'food-manufacturing': foodManufacturingImage,
  'primary-school': primarySchoolImage,
  attendme: attendMeImage,
  chauffr: chauffrImage,
  'smart-loan-helper': smartLoanImage,
  smartbroker: smartBrokerImage,
  'recycled-market': recycledMarketImage,
  estrado: estradoImage,
};

export default function InlinePortfolioAccordion({ artifact, instanceId }) {
  const items = useMemo(() => (artifact?.items || []).filter((item) => images[item.id]), [artifact]);
  const [openId, setOpenId] = useState(() => items[0]?.id || null);

  if (items.length === 0) return null;

  return (
    <div className="inline-work-stack" aria-label="Verified DEKODE work">
      {items.map((item, index) => {
        const isOpen = item.id === openId;
        const panelId = `inline-work-${instanceId}-${artifact.id}-${item.id}`;
        return (
          <article key={item.id} className={`inline-work-item ${isOpen ? 'is-open' : ''}`}>
            <h3>
              <button
                type="button"
                className="inline-work-header"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span className="inline-work-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="inline-work-heading">
                  <strong>{item.name}</strong>
                  <small>{item.category}</small>
                </span>
                <ChevronDown size={17} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} className="inline-work-panel" aria-hidden={!isOpen}>
              <div className="inline-work-panel-inner">
                <div className="inline-work-content">
                  <img src={images[item.id]} alt={`${item.name} DEKODE project`} />
                  <div>
                    <p>{item.summary}</p>
                    {item.detail && <small>{item.detail}</small>}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
