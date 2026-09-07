function safeName = retinaSafeFileName(name)
%RETINASAFEFILENAME Prevent input names from escaping output directories.

[~, baseName, extension] = fileparts(char(string(name)));
safeName = regexprep([baseName extension], '[^A-Za-z0-9_.-]', '_');
if isempty(safeName) || strcmp(safeName, '.') || strcmp(safeName, '..')
    safeName = 'screening_result';
end

end
