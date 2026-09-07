function processedImage = retinaPreprocessImage(imageInput, inputSize)
%RETINAPREPROCESSIMAGE Apply the single inference preprocessing contract.

if ischar(imageInput) || isstring(imageInput)
    if ~isfile(imageInput)
        error('Input image not found: %s', imageInput);
    end
    imageInput = imread(imageInput);
end

if ndims(imageInput) == 2
    imageInput = repmat(imageInput, [1 1 3]);
elseif size(imageInput, 3) ~= 3
    error('Input image must be grayscale or an RGB image.');
end

imageInput = im2uint8(imageInput);
processedImage = imresize(imageInput, inputSize(1:2));

end
