const str = "�»⃟⃫⚡️⃥��������������☆�";

// percorre cada caractere
for (const char of str) {
    const code = char.codePointAt(0); // pega o ponto de código Unicode
    process.stdout.write(`${char} (U+${code.toString(16).toUpperCase()})\n`);
}