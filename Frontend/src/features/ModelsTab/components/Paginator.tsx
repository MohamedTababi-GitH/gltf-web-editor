import { ButtonGroup } from "@/shared/components/button-group.tsx";
import { Button } from "@/shared/components/button.tsx";

type PaginatorProps = {
  totalPages: number;
  setCurrentPage: (value: ((prevState: number) => number) | number) => void;
  currentPage: number;
  pageCursors: (string | null)[];
};

export function Paginator({
  totalPages,
  setCurrentPage,
  currentPage,
  pageCursors,
}: Readonly<PaginatorProps>) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center items-center w-full h-12">
      <ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          {Array.from(new Array(totalPages).keys()).map((page) => (
            <Button
              key={page}
              variant={page + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(page + 1)}
              disabled={pageCursors[page] === undefined}
            >
              {page + 1}
            </Button>
          ))}
        </ButtonGroup>

        <ButtonGroup>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={
              currentPage === totalPages ||
              pageCursors[currentPage] === undefined
            }
          >
            Next
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </div>
  );
}
