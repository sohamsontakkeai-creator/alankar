"""
Invoice HTML Generator
Generates professional invoices as HTML for browser printing
Based on ALANKAR ENGINEERING EQUIPMENTS format
"""
from datetime import datetime
from num2words import num2words
from .product_accessories import get_accessories_for_product


def generate_proforma_invoice(sales_order):
    """
    Generate proforma invoice HTML
    Returns HTML string that can be displayed in browser and printed
    
    Args:
        sales_order: Sales order dictionary
        
    Returns:
        HTML string
    """
    # Extract order data
    order_number = sales_order.get('orderNumber', 'PRO/SH/25-2019')
    customer_name = sales_order.get('customerName', 'SM SCAFFOLDING AND MACHINARIES')
    customer_address = sales_order.get('customerAddress', 'Plot No.69, CTS No.1904/1/90, Shop No. 22/1')
    customer_contact = sales_order.get('customerContact', 'N/A')
    customer_gstin = sales_order.get('customerGstin', '') or sales_order.get('gstNumber', '')  # Get GSTIN if available
    
    # Get product name from showroomProduct nested object
    showroom_product = sales_order.get('showroomProduct', {})
    product_name = showroom_product.get('name', 'Machine') if showroom_product else 'Machine'
    
    # Get accessories - first check if provided in order, otherwise fetch from product data
    accessories = sales_order.get('accessories', [])
    if not accessories:
        # Fetch accessories based on product name
        accessories = get_accessories_for_product(product_name)
    
    sales_person = sales_order.get('salesPerson', 'YOGESH SIR')  # Get sales person name
    quantity = float(sales_order.get('quantity', 1))
    unit_price_with_gst = float(sales_order.get('unitPrice', 0))  # This is the final amount with GST
    
    # Reverse calculate amounts (unitPrice is GST inclusive)
    # Final amount = unit_price_with_gst * quantity
    final_amount = unit_price_with_gst * quantity
    
    # Calculate base amount (without GST)
    # If GST is 18% (9% CGST + 9% SGST), then: final_amount = base_amount * 1.18
    # So: base_amount = final_amount / 1.18
    subtotal = final_amount / 1.18
    
    # Calculate GST amounts
    cgst_amount = subtotal * 0.09  # 9%
    sgst_amount = subtotal * 0.09  # 9%
    
    # Calculate unit rate (base price per unit without GST)
    unit_rate = subtotal / quantity
    
    # Format date
    try:
        order_date = datetime.fromisoformat(sales_order['createdAt'].replace('Z', '+00:00'))
        formatted_date = order_date.strftime('%d-%b-%y')
    except:
        formatted_date = datetime.now().strftime('%d-%b-%y')
    
    # Amount in words
    amount_words = num2words(int(final_amount), lang='en_IN').title()
    
    # Build accessories HTML if available
    accessories_html = ''
    if accessories:
        accessories_items = ''.join([f'<li>{acc}</li>' for acc in accessories])
        accessories_html = f'<ul>{accessories_items}</ul>'
    
    # Generate HTML - exact format from template
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Proforma Invoice</title>
  <style>
    /* Layout closely matching the provided invoice image */
    body{{font-family: 'Arial', sans-serif; color:#111; background:#fff; padding:18px}}
    .sheet{{width:900px; margin:0 auto; border:1px solid #bbb; padding:14px}}
    .top{{display:flex; justify-content:space-between}}
    .left,.right{{box-sizing:border-box}}
    .left{{width:60%}}
    .right{{width:38%; text-align:right}}

    h1.company{{font-size:13px; margin:0 0 4px 0; font-weight:bold}}
    .small{{font-size:11px; color:#333}}

    .meta{{border:1px solid #bbb; padding:8px; text-align:left}}
    .meta-row{{font-size:12px; margin:2px 0}}
    .meta .label{{font-weight:700}}

    .addresses{{display:flex; gap:12px; margin:12px 0}}
    .addr{{width:50%; font-size:12px}}
    .addr strong{{display:block; margin-bottom:6px}}

    table.main{{width:100%; border-collapse:collapse; font-size:12px}}
    table.main th, table.main td{{border:1px solid #bbb; padding:6px; vertical-align:top}}
    table.main thead th{{background:#f2f2f2}}

    .col-sr{{width:36px; text-align:center}}
    .col-desc{{width:56%}}
    .col-hsn{{width:80px; text-align:center}}
    .col-qty{{width:90px; text-align:center}}
    .col-rate{{width:110px; text-align:right}}
    .col-amt{{width:130px; text-align:right}}

    .items ul{{margin:6px 0 0 16px; padding:0}}

    .totals{{width:300px; float:right; margin-top:8px; border-collapse:collapse}}
    .totals td{{border:1px solid #bbb; padding:6px; font-size:12px}}
    .totals td.label{{background:#f7f7f7}}
    .amount-right{{text-align:right}}

    .notes{{clear:both; margin-top:28px; font-size:12px}}
    .amount-words{{margin-top:8px; font-weight:700}}
    .bank{{margin-top:10px}}

    .footer{{margin-top:14px; font-size:11px; color:#444}}

    .signature{{float:right; text-align:center; margin-top:40px}}
    .signature .line{{border-top:1px solid #000; width:160px; margin:0 auto}}

    @media print{{.sheet{{border:none}}}}
  </style>
</head>
<body>
  <h1 style="text-align:center; font-size:20px; margin:0 0 15px 0; font-weight:bold;">PROFORMA INVOICE</h1>
  <div class="sheet">
    <div class="top">
      <div class="left">
        <h1 class="company">ALANKAR ENGINEERING EQUIPMENTS PVT LTD</h1>
        <div class="small">
          H-6/5, MIDC, Chikalthana<br>
          Ch. Sambhajinagar 431001<br>
          GSTIN: 27AAACA6767K1ZN<br>
          State Name: Maharashtra, Code : 27
        </div>
        <hr style="border:none; border-top:1px solid #000; margin:8px 0;">
        
        <div style="font-size:12px">
          <strong>Consignee (Ship to)</strong><br>
          <strong>{customer_name}</strong><br>
          {customer_address}<br>
          GSTIN/UIN: {customer_gstin}<br>
        </div>
        <hr style="border:none; border-top:1px solid #000; margin:8px 0;">
        
        <div style="font-size:12px">
          <strong>Buyer (Bill to)</strong><br>
          <strong>{customer_name}</strong><br>
          {customer_address}<br>
          GSTIN/UIN: {customer_gstin}<br>
        </div>
      </div>

      <div class="right">
        <div class="meta">
          <div class="meta-row"><span class="label">Proforma Invoice No:</span> {order_number}</div>
          <div class="meta-row"><span class="label">Dated:</span> {formatted_date}</div>
          <div class="meta-row"><span class="label">Ref. No. & Date:</span> {sales_person} - {formatted_date}</div>
          <div class="meta-row"><span class="label">Terms of Payment:</span> 100% ADVANCE</div>
          <div class="meta-row"><span class="label">Delivery:</span> BY ROAD</div>
        </div>
      </div>
    </div>

    <table class="main">
      <thead>
        <tr>
          <th class="col-sr">Sr</th>
          <th class="col-desc">Description of Goods</th>
          <th class="col-hsn">HSN/SAC</th>
          <th class="col-qty">Quantity</th>
          <th class="col-rate">Rate</th>
          <th class="col-amt">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="center">1</td>
          <td class="items">
            <strong>{product_name}</strong>
            {accessories_html}
          </td>
          <td class="center">84749000</td>
          <td class="center">{quantity:.3f} NOS</td>
          <td class="amount-right">{unit_rate:,.2f}</td>
          <td class="amount-right">{subtotal:,.2f}</td>
        </tr>

        <!-- space rows to mimic original layout -->
        <tr>
          <td colspan="6" style="height:6px; border:none"></td>
        </tr>

      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td class="label">Taxable Value</td>
        <td class="amount-right">₹ {subtotal:,.2f}</td>
      </tr>
      <tr>
        <td class="label">Output CGST 9%</td>
        <td class="amount-right">₹ {cgst_amount:,.2f}</td>
      </tr>
      <tr>
        <td class="label">Output SGST 9%</td>
        <td class="amount-right">₹ {sgst_amount:,.2f}</td>
      </tr>
      <tr>
        <td class="label"><strong>Total</strong></td>
        <td class="amount-right"><strong>₹ {final_amount:,.2f}</strong></td>
      </tr>
    </table>

    <div style="clear:both"></div>

    <div class="notes">
      <div class="amount-words">Amount Chargeable (in words): INR {amount_words} Only</div>

      <div class="bank">
        <strong>Bank Details</strong>
        <div style="font-size:12px">Bank: SBI<br>Account Name: ALANKAR ENGINEERING EQUIPMENTS PVT LTD<br>A/C No: 41992955581<br>IFSC: SBIN0020316</div>
      </div>

      <div style="margin-top:20px; padding:10px; border:1px solid #bbb; background:#f9f9f9;">
        <strong style="font-size:12px;">Declaration</strong>
        <div style="font-size:11px; margin-top:5px;">
          ** We declare that this documents shows the actual price of the goods described and that all particulars are true and correct. **<br>
          Once goods are sold, they will not be taken back or exchanged.<br>
          Please check the items carefully before purchase.
        </div>
      </div>

      <div class="footer">
        <div style="margin-top:8px">E. & O. E. This is a computer generated proforma invoice and does not require signature.</div>
      </div>
    </div>

  </div>
  
  <div style="text-align:right; margin:20px auto; width:900px;">
    <div style="border-top:1px solid #000; width:200px; margin-left:auto; margin-bottom:5px;"></div>
    <div style="font-size:12px;">Authorised Signatory</div>
  </div>
  
  <div style="text-align:center; margin-top:15px;">
    <div style="font-size:14px; font-weight:bold; margin-bottom:5px;">SUBJECT TO CHHATRAPATI SAMBHAJINAGAR JURISDICTION</div>
    <div style="font-size:12px; font-style:italic;">This is a Computer Generated Invoice</div>
  </div>
</body>
</html>'''
    
    return html



def generate_final_invoice(sales_order):
    """
    Generate final invoice HTML (for Finance Department)
    Returns HTML string that can be displayed in browser and printed
    Same as proforma invoice but with "INVOICE" heading instead of "PROFORMA INVOICE"
    
    Args:
        sales_order: Sales order dictionary
        
    Returns:
        HTML string
    """
    # Extract order data
    order_number = sales_order.get('orderNumber', 'INV/SH/25-2019')
    customer_name = sales_order.get('customerName', 'SM SCAFFOLDING AND MACHINARIES')
    customer_address = sales_order.get('customerAddress', 'Plot No.69, CTS No.1904/1/90, Shop No. 22/1')
    customer_contact = sales_order.get('customerContact', 'N/A')
    customer_gstin = sales_order.get('customerGstin', '') or sales_order.get('gstNumber', '')  # Get GSTIN if available
    
    # Get product name from showroomProduct nested object
    showroom_product = sales_order.get('showroomProduct', {})
    product_name = showroom_product.get('name', 'Machine') if showroom_product else 'Machine'
    
    # Get accessories - first check if provided in order, otherwise fetch from product data
    accessories = sales_order.get('accessories', [])
    if not accessories:
        # Fetch accessories based on product name
        accessories = get_accessories_for_product(product_name)
    
    sales_person = sales_order.get('salesPerson', 'YOGESH SIR')  # Get sales person name
    quantity = float(sales_order.get('quantity', 1))
    unit_price_with_gst = float(sales_order.get('unitPrice', 0))  # This is the final amount with GST
    
    # Reverse calculate amounts (unitPrice is GST inclusive)
    # Final amount = unit_price_with_gst * quantity
    final_amount = unit_price_with_gst * quantity
    
    # Calculate base amount (without GST)
    # If GST is 18% (9% CGST + 9% SGST), then: final_amount = base_amount * 1.18
    # So: base_amount = final_amount / 1.18
    subtotal = final_amount / 1.18
    
    # Calculate GST amounts
    cgst_amount = subtotal * 0.09  # 9%
    sgst_amount = subtotal * 0.09  # 9%
    
    # Calculate unit rate (base price per unit without GST)
    unit_rate = subtotal / quantity
    
    # Format date
    try:
        order_date = datetime.fromisoformat(sales_order['createdAt'].replace('Z', '+00:00'))
        formatted_date = order_date.strftime('%d-%b-%y')
    except:
        formatted_date = datetime.now().strftime('%d-%b-%y')
    
    # Amount in words
    amount_words = num2words(int(final_amount), lang='en_IN').title()
    
    # Build accessories HTML if available
    accessories_html = ''
    if accessories:
        accessories_items = ''.join([f'<li>{acc}</li>' for acc in accessories])
        accessories_html = f'<ul>{accessories_items}</ul>'
    
    # Generate HTML - exact format from template but with "INVOICE" heading
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice</title>
  <style>
    /* Layout closely matching the provided invoice image */
    body{{font-family: 'Arial', sans-serif; color:#111; background:#fff; padding:18px}}
    .sheet{{width:900px; margin:0 auto; border:1px solid #bbb; padding:14px}}
    .top{{display:flex; justify-content:space-between}}
    .left,.right{{box-sizing:border-box}}
    .left{{width:60%}}
    .right{{width:38%; text-align:right}}

    h1.company{{font-size:13px; margin:0 0 4px 0; font-weight:bold}}
    .small{{font-size:11px; color:#333}}

    .meta{{border:1px solid #bbb; padding:8px; text-align:left}}
    .meta-row{{font-size:12px; margin:2px 0}}
    .meta .label{{font-weight:700}}

    .addresses{{display:flex; gap:12px; margin:12px 0}}
    .addr{{width:50%; font-size:12px}}
    .addr strong{{display:block; margin-bottom:6px}}

    table.main{{width:100%; border-collapse:collapse; font-size:12px}}
    table.main th, table.main td{{border:1px solid #bbb; padding:6px; vertical-align:top}}
    table.main thead th{{background:#f2f2f2}}

    .col-sr{{width:36px; text-align:center}}
    .col-desc{{width:56%}}
    .col-hsn{{width:80px; text-align:center}}
    .col-qty{{width:90px; text-align:center}}
    .col-rate{{width:110px; text-align:right}}
    .col-amt{{width:130px; text-align:right}}

    .items ul{{margin:6px 0 0 16px; padding:0}}

    .totals{{width:300px; float:right; margin-top:8px; border-collapse:collapse}}
    .totals td{{border:1px solid #bbb; padding:6px; font-size:12px}}
    .totals td.label{{background:#f7f7f7}}
    .amount-right{{text-align:right}}

    .notes{{clear:both; margin-top:28px; font-size:12px}}
    .amount-words{{margin-top:8px; font-weight:700}}
    .bank{{margin-top:10px}}

    .footer{{margin-top:14px; font-size:11px; color:#444}}

    .signature{{float:right; text-align:center; margin-top:40px}}
    .signature .line{{border-top:1px solid #000; width:160px; margin:0 auto}}

    @media print{{.sheet{{border:none}}}}
  </style>
</head>
<body>
  <h1 style="text-align:center; font-size:20px; margin:0 0 15px 0; font-weight:bold;">INVOICE</h1>
  <div class="sheet">
    <div class="top">
      <div class="left">
        <h1 class="company">ALANKAR ENGINEERING EQUIPMENTS PVT LTD</h1>
        <div class="small">
          H-6/5, MIDC, Chikalthana<br>
          Ch. Sambhajinagar 431001<br>
          GSTIN: 27AAACA6767K1ZN<br>
          State Name: Maharashtra, Code : 27
        </div>
        <hr style="border:none; border-top:1px solid #000; margin:8px 0;">
        
        <div style="font-size:12px">
          <strong>Consignee (Ship to)</strong><br>
          <strong>{customer_name}</strong><br>
          {customer_address}<br>
          GSTIN/UIN: {customer_gstin}<br>
        </div>
        <hr style="border:none; border-top:1px solid #000; margin:8px 0;">
        
        <div style="font-size:12px">
          <strong>Buyer (Bill to)</strong><br>
          <strong>{customer_name}</strong><br>
          {customer_address}<br>
          GSTIN/UIN: {customer_gstin}<br>
        </div>
      </div>

      <div class="right">
        <div class="meta">
          <div class="meta-row"><span class="label">Invoice No:</span> {order_number}</div>
          <div class="meta-row"><span class="label">Dated:</span> {formatted_date}</div>
          <div class="meta-row"><span class="label">Ref. No. & Date:</span> {sales_person} - {formatted_date}</div>
          <div class="meta-row"><span class="label">Terms of Payment:</span> 100% ADVANCE</div>
          <div class="meta-row"><span class="label">Delivery:</span> BY ROAD</div>
        </div>
      </div>
    </div>

    <table class="main">
      <thead>
        <tr>
          <th class="col-sr">Sr</th>
          <th class="col-desc">Description of Goods</th>
          <th class="col-hsn">HSN/SAC</th>
          <th class="col-qty">Quantity</th>
          <th class="col-rate">Rate</th>
          <th class="col-amt">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="center">1</td>
          <td class="items">
            <strong>{product_name}</strong>
            {accessories_html}
          </td>
          <td class="center">84749000</td>
          <td class="center">{quantity:.3f} NOS</td>
          <td class="amount-right">{unit_rate:,.2f}</td>
          <td class="amount-right">{subtotal:,.2f}</td>
        </tr>

        <!-- space rows to mimic original layout -->
        <tr>
          <td colspan="6" style="height:6px; border:none"></td>
        </tr>

      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td class="label">Taxable Value</td>
        <td class="amount-right">₹ {subtotal:,.2f}</td>
      </tr>
      <tr>
        <td class="label">Output CGST 9%</td>
        <td class="amount-right">₹ {cgst_amount:,.2f}</td>
      </tr>
      <tr>
        <td class="label">Output SGST 9%</td>
        <td class="amount-right">₹ {sgst_amount:,.2f}</td>
      </tr>
      <tr>
        <td class="label"><strong>Total</strong></td>
        <td class="amount-right"><strong>₹ {final_amount:,.2f}</strong></td>
      </tr>
    </table>

    <div style="clear:both"></div>

    <div class="notes">
      <div class="amount-words">Amount Chargeable (in words): INR {amount_words} Only</div>

      <div class="bank">
        <strong>Bank Details</strong>
        <div style="font-size:12px">Bank: SBI<br>Account Name: ALANKAR ENGINEERING EQUIPMENTS PVT LTD<br>A/C No: 41992955581<br>IFSC: SBIN0020316</div>
      </div>

      <div style="margin-top:20px; padding:10px; border:1px solid #bbb; background:#f9f9f9;">
        <strong style="font-size:12px;">Declaration</strong>
        <div style="font-size:11px; margin-top:5px;">
          ** We declare that this documents shows the actual price of the goods described and that all particulars are true and correct. **<br>
          Once goods are sold, they will not be taken back or exchanged.<br>
          Please check the items carefully before purchase.
        </div>
      </div>

      <div class="footer">
        <div style="margin-top:8px">E. & O. E. This is a computer generated invoice and does not require signature.</div>
      </div>
    </div>

  </div>
  
  <div style="text-align:right; margin:20px auto; width:900px;">
    <div style="border-top:1px solid #000; width:200px; margin-left:auto; margin-bottom:5px;"></div>
    <div style="font-size:12px;">Authorised Signatory</div>
  </div>
  
  <div style="text-align:center; margin-top:15px;">
    <div style="font-size:14px; font-weight:bold; margin-bottom:5px;">SUBJECT TO CHHATRAPATI SAMBHAJINAGAR JURISDICTION</div>
    <div style="font-size:12px; font-style:italic;">This is a Computer Generated Invoice</div>
  </div>
</body>
</html>'''
    
    return html
