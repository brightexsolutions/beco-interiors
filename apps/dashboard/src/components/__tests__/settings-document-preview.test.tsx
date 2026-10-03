import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SettingsDocumentPreview, type DocumentPreviewValues } from '../settings-document-preview';

const values = (over: Partial<DocumentPreviewValues> = {}): DocumentPreviewValues => ({
  businessLegalName: 'Beco Interiors Limited',
  businessAddress: 'Urban Square, Shop 8 and 9\nEnterprise Road, Nairobi',
  businessEmail: 'info@beco.co.ke',
  kraPin: 'p051234567x',
  vatNumber: '',
  businessPhone: '',
  bankDetails: '',
  tillNumber: '',
  paybillNumber: '',
  paybillAccount: '',
  sendMoneyNumber: '',
  ...over,
});

describe('SettingsDocumentPreview', () => {
  it('prints the From block the PDF prints, PIN uppercased, phone defaulted', () => {
    render(<SettingsDocumentPreview values={values()} />);
    expect(screen.getByTestId('preview-from-name')).toHaveTextContent('Beco Interiors Limited');
    expect(screen.getByText('Urban Square, Shop 8 and 9')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Road, Nairobi')).toBeInTheDocument();
    expect(screen.getByText('+254 722 333 730')).toBeInTheDocument();
    expect(screen.getByTestId('preview-tax')).toHaveTextContent('KRA PIN P051234567X');
    expect(screen.getByTestId('preview-tax')).not.toHaveTextContent('VAT No.');
  });

  it('adds a VAT number only when it differs from the PIN', () => {
    render(<SettingsDocumentPreview values={values({ vatNumber: 'V0098765' })} />);
    expect(screen.getByTestId('preview-tax')).toHaveTextContent('KRA PIN P051234567X · VAT No. V0098765');
  });

  it('says plainly when no PIN or payment channel will print', () => {
    render(<SettingsDocumentPreview values={values({ kraPin: '' })} />);
    expect(screen.queryByTestId('preview-tax')).not.toBeInTheDocument();
    expect(screen.getByText('KRA PIN not set, so none prints')).toBeInTheDocument();
    expect(screen.getByText('No payment channel set, so this box is left off')).toBeInTheDocument();
  });

  it('lists each payment channel that is filled in, paybill with its account', () => {
    render(
      <SettingsDocumentPreview
        values={values({ tillNumber: '555123', paybillNumber: '222111', paybillAccount: 'BECO', bankDetails: 'KCB, Industrial Area' })}
      />,
    );
    const box = screen.getByText('How to pay').parentElement!;
    expect(within(box).getByText('Till')).toBeInTheDocument();
    expect(within(box).getByText('555123')).toBeInTheDocument();
    expect(within(box).getByText('Account BECO')).toBeInTheDocument();
    expect(within(box).getByText('KCB, Industrial Area')).toBeInTheDocument();
    expect(within(box).queryByText('Send money')).not.toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(<SettingsDocumentPreview values={values({ tillNumber: '555123' })} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
