import re

with open('frontend/src/pages/LoginPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Inline the InputField component everywhere it is used
def replace_input_field(match):
    label = match.group(1)
    type_attr = match.group(2)
    value = match.group(3)
    onChange = match.group(4)
    placeholder = match.group(5)
    return f"""<div>
    <label style={{{{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#334155', letterSpacing: '0.04em', marginBottom: 6 }}}}>
      {label}
    </label>
    <input
      type="{type_attr}"
      placeholder="{placeholder}"
      value={{{value}}}
      onChange={{{onChange}}}
      required
      style={{{{
        width: '100%', padding: '12px 14px', fontSize: '0.95rem', color: '#0f172a',
        background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10,
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s'
      }}}}
      onFocus={{(e) => {{{{
        e.target.style.background = '#ffffff';
        e.target.style.borderColor = '#f97316';
        e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
      }}}}}}
      onBlur={{(e) => {{{{
        e.target.style.background = '#f8fafc';
        e.target.style.borderColor = '#cbd5e1';
        e.target.style.boxShadow = 'none';
      }}}}}}
    />
  </div>"""

content = re.sub(
    r'<InputField\s+label="([^"]+)"\s+type="([^"]+)"\s+value=\{([^}]+)\}\s+onChange=\{([^}]+)\}\s+placeholder="([^"]+)"\s*/>',
    replace_input_field,
    content
)

# Remove the InputField definition
content = re.sub(r'const InputField = \(\{.*?\}\) => \([\s\S]*?\);\n\n', '', content)

with open('frontend/src/pages/LoginPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("LoginPage.jsx fixed")
